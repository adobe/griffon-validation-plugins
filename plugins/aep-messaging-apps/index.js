/*!
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 *
 */
(function (events, settings, connections) {
  const { toolkit: kit } = window.griffon;
  const { sharedState } = kit['aep-mobile'];

  const eventMap = {};
  const clientMap = {};
  let results;
  let hasSuccess = false;

  const baseAppUrl = client =>
    `https://experience.adobe.com/data-collection/appConfigurations/companies/${client.companyId}`;
  const baseLaunchUrl = client =>
    `https://experience.adobe.com/launch/companies/${client.companyId}/properties/${client.propertyId}`;

  // for each client, we will run against the most recent property id and ecid we find
  // most recent will be the first. If any of the clients fail, we'll return that error

  events.forEach((event) => {
    if (sharedState.isMatch(event)) {
      const clientId = sharedState.get('clientId', event);
      const xdm = sharedState.getXdm(event)

      const ecid = xdm?.identityMap?.ECID?.[0]?.id;
      const propertyId = sharedState.getStateData(event)?.['property.id'];
      // const edgeConfigId = sharedState.getStateData(event)?.['edge.configId'];

      clientMap[clientId] = clientMap[clientId] || {};
      eventMap[clientId] = eventMap[clientId] || {};

      if (ecid && !clientMap[clientId].ecid) {
        clientMap[clientId].ecid = ecid;
        eventMap[clientId].ecid = event;
      }
      if (propertyId && !clientMap[clientId].propertyId) {
        clientMap[clientId].propertyId = propertyId;
        eventMap[clientId].propertyId = event;
      }
    }
  });
  const clientIds = Object.keys(clientMap);

  // first we're going to search for companyId. companyId is used for deeplinks to parts of launch
  connections.forEach((connection) => {
    if (connection.namespace === 'dev2') {
      for (let i = 0; i < clientIds.length; ++i) {
        const id = clientIds[i];
        const client = clientMap[id];

        if (client && connection.context.propertyId === client.propertyId) {
          if (connection.loading) {
            results = {
              result: 'loading',
              message: 'Loading Launch Property'
            };
          } else if (connection.error) {
            const details = connection.error.state === 403
              ? 'It appears your user doesn\'t have access to load Launch Properties. Please validate your provisioning and try again'
              : 'An unknown error has occurred while attempting to load the Launch Property. Please validate that you are properly provisioned and try again.';
            results = {
              result: 'not matched',
              message: 'Error Loading Launch Property',
              details,
              events: [eventMap[id].propertyId]
            };
          } else if (connection.loaded) {
            clientMap[id].companyId = connection.data.companyId;
          }
        }
      }
    }
  });

  if (results) { return results; }

  // now let's locate the profile. I use the profile in the app validation next
  connections.forEach((connection) => {
    if (connection.namespace === 'dev6') {
      for (let i = 0; i < clientIds.length; ++i) {
        const id = clientIds[i];
        const client = clientMap[id];
        if (!client.ecid) {
          results = {
            result: 'not matched',
            message: 'No ECID Detected',
            details: 'We did not detect an ECID. You may need to configure and publish the Identity extension.',
            links: [
              {
                label: 'Extension Catalog',
                link: `${baseLaunchUrl(client)}/extensions/catalog`
              },
              {
                label: 'Publishing',
                link: `${baseLaunchUrl(client)}/publishing`
              }
            ]
          };
        } else if (connection.context.ecid === client.ecid) {
          if (connection.loading) {
            results = {
              result: 'loading',
              message: 'Loading Profile'
            };
            delete clientMap[id];
          } else if (connection.error) {
            const details = connection.error.state === 403
              ? 'It appears your user doesn\'t have access to load the Profiles. Please validate your provisioning and try again'
              : 'An unknown error has occurred while attempting to load the Profile. Please validate that you are properly provisioned and try again.';
            results = {
              result: 'not matched',
              message: 'Error Loading Profile',
              details,
              events: [eventMap[id].ecid]
            };
          } else if (connection.loaded) {
            const normalizePlatform = platform => (
              platform === 'apnsSandbox' ? 'apns' : platform
            );

            clientMap[id].platform = normalizePlatform(connection?.data.pushDetails?.platform);
            clientMap[id].appId = connection.data?.pushDetails?.appID;
          }
        }
      }
    }
  });

  if (results) { return results; }

  connections.forEach((connection) => {
    if (connection.namespace === 'dev3') {
      for (let i = 0; i < clientIds.length; ++i) {
        const id = clientIds[i];
        const client = clientMap[id];
        if (connection.context.companyId === client.companyId) {
          if (connection.loading) {
            results = {
              result: 'loading',
              message: 'Loading App Configurations'
            };
          } else if (connection.error) {
            const details = connection.error.state === 403
              ? 'It appears your user doesn\'t have access to load the App Configurations. Please validate your provisioning and try again'
              : 'An unknown error has occurred while attempting to load the App Configuration. Please validate that you are properly provisioned and try again.';
            results = {
              result: 'not matched',
              message: 'Error Loading App Configurations',
              details,
              events: [eventMap[id].propertyId]
            };
            delete clientMap[id];
          } else if (connection.loaded) {
            const apps = connection.data;
            if (!apps?.length) {
              results = {
                result: 'not matched',
                message: 'No App Configurations',
                details: `You haven\'t created any App Configurations yet. Create a new config using a platform of '${client.platform}' and an App ID of '${client.appId}'.`,
                links: [
                  {
                    label: 'Manage App Configurations',
                    link: `${baseAppUrl(client)}/configurations`
                  }
                ],
                events: [eventMap[id].propertyId]
              };
            } else {
              const match = apps.find(
                app => (app.app_id === client.appId && app.messaging_service === client.platform)
              );

              if (match) {
                hasSuccess = true;
              } else {
                results = {
                  result: 'not matched',
                  message: 'No Matching App Detected',
                  details: `There isn\'t a matching App Configurations for this App. Make sure you have an App Configuration with a platform of '${client.platform}' and an App ID of '${client.appId}'.`,
                  links: [
                    {
                      label: 'Manage App Configurations',
                      link: `${baseAppUrl(client)}/configurations`
                    }
                  ],
                  events: [eventMap[id].propertyId]
                };
              }
            }
          }
        }
      }
    }
  });

  if (results) { return results; }
  if (hasSuccess) { return { result: 'matched', message: 'App is configured' }; }
  return { result: 'unknown', message: 'Unknown' }; // leftovers
});
