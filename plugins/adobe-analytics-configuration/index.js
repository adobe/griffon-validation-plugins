/*!
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 *
 */
(function (events) {
  const configurationEvents = events.filter(event => event.payload.ACPExtensionEventType === 'com.adobe.eventtype.configuration');
  const valid = configurationEvents.some((event) => {
    const rsids = event.payload.ACPExtensionEventData['analytics.rsids'];
    const server = event.payload.ACPExtensionEventData['analytics.server'];
    return rsids && server;
  });

  const message = valid ? 'Valid! Adobe Analytics Extension has been configured!'
    : 'Missing required configuration for Adobe Analytics';
  const errors = valid ? [] : configurationEvents.map(event => event.uuid);
  return {
    events: errors,
    message,
    result: valid ? 'matched' : 'not matched'
  };
});
