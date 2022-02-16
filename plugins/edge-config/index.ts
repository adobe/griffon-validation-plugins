/*
  Copyright 2021 Adobe. All rights reserved.
  This file is licensed to you under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License. You may obtain a copy
  of the License at http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software distributed under
  the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
  OF ANY KIND, either express or implied. See the License for the specific language
  governing permissions and limitations under the License.
*/

import { Configuration } from '@adobe/griffon-toolkit-aep-mobile';
import { Event } from '@adobe/griffon-toolkit-common';
import { ValidationPluginResult } from '../../types/validationPlugin';

(function (events: Event[]): ValidationPluginResult {
  const { toolkit: kit } = window.griffon;
  const { configuration } = kit['aep-mobile'];
  const configEvents = kit.match(
    configuration.matcher,
    events
  ) as Configuration[];

  const hasAllConfig = (event: Configuration) =>
    configuration.getEventDataKey('"edge.configId"', event);

  return !configEvents.length
    ? {
        events: [],
        message:
          "No configuration info could be found. Either Griffon isn't registered or it did not pass in cached events upon activating.",
        result: 'not matched'
      }
    : configEvents.some(hasAllConfig)
    ? {
        events: [],
        message: 'Edge extension was configured correctly',
        result: 'matched'
      }
    : {
        message:
          'Did not detect the required configuration values. You may need to install the extension in launch and publish those settings.',
        events: configEvents.map((event) => event.uuid),
        result: 'not matched'
      };
});
