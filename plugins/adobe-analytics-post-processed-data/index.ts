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

import { Event } from '@adobe/griffon-toolkit-common';
import {
  GenericTrack,
  LifecycleStart
} from '@adobe/griffon-toolkit-aep-mobile';
import { ValidationPluginResult } from '../../types/validationPlugin';

(function (events: Event[]): ValidationPluginResult {
  const {
    toolkit: { 'aep-mobile': aepMobile, combineAny, match }
  } = window.griffon;
  const analyticsTrackEvents = match(
    combineAny([
      aepMobile.genericTrack.matcher,
      aepMobile.lifecycleStart.matcher
    ]),
    events
  ) as (GenericTrack & LifecycleStart)[];
  let valid = true;
  const invalidEvents: string[] = [];
  for (let i = 0; i < analyticsTrackEvents.length; i++) {
    const analyticsTrackEvent = analyticsTrackEvents[i];
    const analyticsAnnotation = analyticsTrackEvent.annotations.find(
      (annotation) => annotation.type.startsWith('analytics')
    );
    if (
      !analyticsAnnotation ||
      !analyticsAnnotation.payload ||
      !analyticsAnnotation.payload.hitDebugMessages
    ) {
      valid = false;
      invalidEvents.push(analyticsTrackEvent.uuid);
    }
  }
  const message = valid
    ? 'All Analytics events have post-processed data!'
    : 'Analytics post processed debug information is unavailable for this hit.\n\n' +
      'Please note that this does not indicate a problem with the processing of your data. ' +
      'This specific data is an additional debug source to help you understand how Analytics ' +
      'interpreted the data in near real time.\n\n' +
      'The post processing rules debug information provided by Analytics has to be retrieved ' +
      'within 24 hours from when the hit was sent to the Adobe Analytics collection service. ' +
      'To capture this data, you need to open the Assurance Analytics plugin. This plugin is ' +
      "responsible for gathering the debug data. If the plugin hasn't been accessed OR more " +
      'than 24 hours passed since the hit was sent, this error will be present.';
  return {
    events: invalidEvents,
    message,
    result: valid ? 'matched' : 'not matched'
  };
});
