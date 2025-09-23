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

import { PersonalizationEdgeRequest } from '@adobe/griffon-toolkit-aep-mobile';
import { Event } from '@adobe/griffon-toolkit-common';
import { DecodedScope, IAMPersonalizationResponse } from 'types/iam';
import { ValidationPluginResult } from '../../types/validationPlugin';

(function (events: Event[]): ValidationPluginResult {
  const { toolkit: kit } = window.griffon;
  const { personalizationEdgeRequest, personalizationEdgeResponse } =
    kit['aep-mobile'];
  const personalizationRequests = kit.match(
    kit.combineAll([
      personalizationEdgeRequest.matcher,
      'payload.ACPExtensionEventData.query.personalization.decisionScopes'
    ]),
    events
  ) as PersonalizationEdgeRequest[];

  const personalizationResponses = kit.match(
    personalizationEdgeResponse.matcher,
    events
  ) as IAMPersonalizationResponse[];

  const requestScopes = personalizationRequests.map((request) => ({
    uuid: request.uuid,
    scopes:
      request.payload.ACPExtensionEventData.query.personalization.decisionScopes
  }));

  const responseScopes = personalizationResponses.flatMap((response) =>
    response.payload.ACPExtensionEventData?.payload?.map((p) => p?.scope)
  );

  const missingScopes = requestScopes.reduce((result, { uuid, scopes }) => {
    if (scopes.some((scope) => !responseScopes.includes(scope))) {
      result.push(uuid);
    }
    return result;
  }, [] as string[]);

  const invalidScopes = requestScopes.reduce((result, { scopes, uuid }) => {
    scopes?.forEach((scope) => {
      try {
        const decodedScope = JSON.parse(window.atob(scope)) as DecodedScope;
        if (
          !decodedScope?.['xdm:name'] ||
          !/[A-Za-z0-9]*\.[A-Za-z0-9]*\.[A-Za-z0-9]*/.test(
            decodedScope['xdm:name']
          )
        ) {
          if (!result.includes(uuid)) {
            result.push(uuid);
          }
        }
      } catch {
        if (!result.includes(uuid)) {
          result.push(uuid);
        }
      }
    });

    return result;
  }, [] as string[]);

  const isInvalid =
    !personalizationRequests.length ||
    missingScopes.length ||
    invalidScopes.length;

  return isInvalid
    ? {
        result: 'not matched',
        message: `${
          missingScopes.length
            ? 'There are request scopes that did not have a corresponding response'
            : ''
        } ${missingScopes.length && invalidScopes.length ? ' .' : ''} ${
          invalidScopes.length
            ? 'There are request scopes that do not have a name in the pattern of *.*.*'
            : ''
        }`,
        events: [...missingScopes, ...invalidScopes]
      }
    : {
        result: 'matched',
        message:
          'Valid! All In App Messaging Request scopes had a matching response'
      };
});
