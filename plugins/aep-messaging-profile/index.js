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

  const REQUIRED_PROFILE_MIXINS = [
    'https://ns.adobe.com/xdm/context/identitymap',
    'https://ns.adobe.com/xdm/context/profile-push-notification-details'
  ];

  let results;
  let hasProfile = false;
  let hasSchema = false;

  const baseDatastreamUrl = client =>
    `https://experience.adobe.com/data-collection/dataStreams/companies/${client.companyId}`;
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
      const edgeConfigId = sharedState.getStateData(event)?.['edge.configId'];
      const token = sharedState.getStateData(event)?.['pushidentifier'];

      clientMap[clientId] = clientMap[clientId] || {};
      eventMap[clientId] = eventMap[clientId] || {};

      if (ecid && !clientMap[clientId].ecid) {
        clientMap[clientId].ecid = ecid;
        eventMap[clientId].ecid = event;
      }
      if (edgeConfigId && !clientMap[clientId].edgeConfigId) {
        clientMap[clientId].edgeConfigId = edgeConfigId;
        eventMap[clientId].edgeConfigId = event;
      }
      if (propertyId && !clientMap[clientId].propertyId) {
        clientMap[clientId].propertyId = propertyId;
        eventMap[clientId].propertyId = event;
      }
      if (token && !clientMap[clientId].token) {
        clientMap[clientId].token = token;
        eventMap[clientId].token = event;
      }
    }
  });
  const clientIds = Object.keys(clientMap);

  // we're going to loop through once to grab the company ids
  // this isnt required, so we wont error on these
  connections.forEach((connection) => {
    if (connection.namespace === 'dev2') {
      for (let i = 0; i < clientIds.length; ++i) {
        const id = clientIds[i];
        const client = clientMap[id];

        if (client && connection.context.propertyId === client.propertyId) {
          if (connection.loaded) {
            clientMap[id].companyId = connection.data.companyId;
          }
        }
      }
    }
  });

  const getExtensionLinks = (client) => {
    let extensionLinks;
    if (client.companyId) {
      extensionLinks = [
        {
          label: 'Extension Catalog',
          link: `${baseLaunchUrl(client)}/extensions/catalog`
        },
        {
          label: 'Publishing',
          link: `${baseLaunchUrl(client)}/publishing`
        }
      ];
    }
    return extensionLinks;
  };

  // let's validate that all the clients have the valid configurations
  for (let i = 0; i < clientIds.length; ++i) {
    const id = clientIds[i];
    const client = clientMap[id];

    if (!client.ecid) {
      results = {
        result: 'not matched',
        message: 'No ECID Detected',
        details: 'We did not detect an ECID. You may need to configure and publish the Identity extension. Otherwise you may try restarting your mobile app.',
        links: getExtensionLinks(client)
      };
    } else if (!client.token) {
      results = {
        result: 'not matched',
        message: 'Push Token Not Captured',
        details: 'The App wasn\'t setup correctly for messaging. Make sure you\'ve followed the steps to enable push messaging in your application and that you are calling the setPushIdentifier API.',
        links: [
          {
            label: 'Documentation: Setup Push',
            link: 'https://aep-sdks.gitbook.io/docs/using-mobile-extensions/adobe-journey-optimizer#implement-extension-in-mobile-app'
          }
        ]
      };
    } else if (!client.edgeConfigId) {
      results = {
        result: 'not matched',
        message: 'Edge Not Configured',
        details: 'Make sure you\'ve installed the Adobe Experience Platform Edge Network and that you\'ve published your changes.',
        links: getExtensionLinks(client)
      };
    }
  }

  if (results) { return results; }

  // we need to extract out the profile dataset
  connections.forEach((connection) => {
    if (connection.namespace === 'dev1') {
      for (let i = 0; i < clientIds.length; ++i) {
        const id = clientIds[i];
        const client = clientMap[id];
        const event = eventMap[id];

        if (connection.context.combinedId === client.edgeConfigId) {
          if (connection.loading) {
            results = {
              result: 'loading',
              message: 'Loading Edge Configuration'
            };
          } else if (connection.error) {
            const details = connection.error.state === 403
              ? 'It appears your user doesn\'t have access to load Edge Configurations. Please validate your provisioning and try again'
              : 'An unknown error has occurred while attempting to load the Edge Configuration. Please validate that you are properly provisioned and try again.';
            results = {
              result: 'not matched',
              message: 'Error Loading Edge Configuration',
              details,
              events: [event.edgeConfigId]
            };
          } else if (connection.loaded) {
            clientMap[id].profileSchema = connection.data?.profileSchema;
          }
        }
      }
    }
  });

  if (results) { return results; }

  // we need to find the schema and make sure it contains the needed mixins
  connections.forEach((connection) => {
    if (connection.namespace === 'dev4') {
      for (let i = 0; i < clientIds.length; ++i) {
        const id = clientIds[i];
        const client = clientMap[id];
        const event = eventMap[id];

        if (connection.context.schemaUrl === client.profileSchema) {
          if (connection.loading) {
            results = {
              result: 'loading',
              message: 'Loading Profile Schema'
            };
          } else if (connection.error) {
            const details = connection.error.state === 403
              ? 'It appears your user doesn\'t have access to load Schemas. Please validate your provisioning and try again'
              : 'An unknown error has occurred while attempting to load the Tracking Schema. It\'s possible this Dataset does not exist.';
            results = {
              result: 'not matched',
              message: 'Error Loading Profile Schema',
              details,
              events: [event.edgeConfigId]
            };
          } else if (connection.loaded) {
            for (let i = 0; i < REQUIRED_PROFILE_MIXINS.length; ++i) {
              if (connection.data.extends.indexOf(REQUIRED_PROFILE_MIXINS[i]) === -1) {
                let links;
                if (client.companyId) {
                  const parts = client.edgeConfigId.split(':');
                  links = [
                    {
                      label: 'View Edge Configuration',
                      link: `${baseDatastreamUrl(client)}/dataStreams/${parts[0]}/environments/${parts[1] || 'prod'}/edit`
                    }
                  ];
                }

                results = {
                  result: 'not matched',
                  message: 'Invalid Profile Dataset',
                  details: 'For messaging, the "pushNotificationDetails" and "identityMap" mixins are required for the profile dataset. Please make sure the profile you\'ve configured has these mixins.',
                  events: [event.edgeConfigId],
                  links
                };
              }
            }
            if (!results) {
              hasSchema = true;
            }
          }
        }
      }
    }
  });

  if (results) { return results; }


  // now let's locate the profile.
  connections.forEach((connection) => {
    if (connection.namespace === 'dev6') {
      for (let i = 0; i < clientIds.length; ++i) {
        const id = clientIds[i];
        const client = clientMap[id];
        if (connection.context.ecid === client.ecid) {
          if (connection.loading) {
            results = {
              result: 'loading',
              message: 'Loading Profile'
            };
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
            // validate that the token equals the local token
            if (connection.data?.pushDetails?.token !== clientMap[id].token) {
              results = {
                result: 'not matched',
                message: 'Push Token Mismatch',
                details: 'The push token stored in this profile does not match the push token on the device.',
                events: [eventMap[id].token]
              };
            } else {
              hasProfile = true;
            }
          }
        }
      }
    }
  });

  if (results) { return results; }
  if (hasProfile && hasSchema) { return { result: 'matched', message: 'Data successfully written to Profile' }; }
  return { result: 'unknown', message: 'Unknown' }; // leftovers
});
