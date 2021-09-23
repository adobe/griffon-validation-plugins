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

  const baseLaunchUrl = client =>
    `https://experience.adobe.com/launch/companies/${client.companyId}/properties/${client.propertyId}`;


  // we're going to grab the most recent edge.configId for each connected client. If any of them have errors
  // we'll return errors

  events.forEach((event) => {
    if (sharedState.isMatch(event)) {
      const clientId = sharedState.get('clientId', event);
      const edgeConfigId = sharedState.getStateData(event)?.['edge.configId'];
      const propertyId = sharedState.getStateData(event)?.['property.id'];

      clientMap[clientId] = clientMap[clientId] || {};
      eventMap[clientId] = eventMap[clientId] || {};

      if (edgeConfigId && !clientMap[clientId].edgeConfigId) {
        clientMap[clientId].edgeConfigId = edgeConfigId;
        eventMap[clientId].edgeConfigId = event;
      }
      // collect property ids for links
      if (propertyId && !clientMap[clientId].propertyId) {
        clientMap[clientId].propertyId = propertyId;
        eventMap[clientId].propertyId = event;
      }
    }
  });

  const clientIds = Object.keys(clientMap);
  let hasSuccess;
  let results;

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

  // let's validate that the clients have a valid edgeConfigId
  for (let i = 0; i < clientIds.length; ++i) {
    const id = clientIds[i];
    const client = clientMap[id];

    if (!client.edgeConfigId) {
      let links;
      if (client.companyId) {
        links = [
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

      results = {
        result: 'not matched',
        message: 'Edge Not Configured',
        details: 'Make sure you\'ve installed the Adobe Experience Platform Edge Network and that you\'ve published your changes.',
        links
      };
    }
  }

  if (results) { return results; }

  // now we're going to see if we got edge configs loaded for this data
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
            hasSuccess = true;
          }
        }
      }
    }
  });

  if (results) { return results; }
  if (hasSuccess) { return { result: 'matched', message: 'Edge is configured correctly' }; }
  return { result: 'unknown', message: 'Unknown' }; // leftovers
});
