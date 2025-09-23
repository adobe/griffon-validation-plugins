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
import { IAMPersonalizationResponse } from 'types/iam';
import { ValidationPluginResult } from '../../types/validationPlugin';

(function (events: Event[]): ValidationPluginResult {
  const { toolkit: kit } = window.griffon;
  const { personalizationEdgeResponse } = kit['aep-mobile'];
  const personalizationResponses = kit.match(
    personalizationEdgeResponse.matcher,
    events
  ) as IAMPersonalizationResponse[];

  if (!personalizationResponses.length) {
    return {
      message:
        'Unable to detect any Messaging Response events. Please ensure responses are received for your personalization request.',
      result: 'not matched',
      events: []
    };
  }

  const errors = personalizationResponses.reduce(
    (result, { payload, uuid }) => {
      const hasInvalidContent = payload.items?.some((item) => {
        const content = JSON.parse(item?.data?.content || '{}');
        if (!content.rules?.length) {
          return true;
        }
        return false;
      });

      if (hasInvalidContent) {
        result.push(uuid);
      }

      return result;
    },
    [] as string[]
  );

  return errors.length
    ? {
        message:
          'There are responses missing In App Messaging rules in the payload.',
        result: 'not matched',
        events: errors
      }
    : {
        message: 'Valid! All In App Messaging Response Events are correct.',
        result: 'matched',
        events: []
      };
});
