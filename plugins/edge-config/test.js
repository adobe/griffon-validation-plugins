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

import validator from './index';

const { toolkit: kit } = window.griffon;
const { sharedState } = kit['aep-mobile'];

const mockValidConfig = sharedState.mock({
  clientId: 'test',
  stateData: { 'property.id': 'mockPropertyId', 'edge.configId': 'configId:envName' }
});
const mockInvalidConfig = sharedState.mock({
  clientId: 'test',
  stateData: { 'property.id': 'mockPropertyId' }
});

const mockValidCompany = {
  namespace: 'dev2',
  context: { propertyId: 'mockPropertyId' },
  data: { companyId: 'mockCompanyId' },
  loaded: true
};
const mockValidEdgeConfig = {
  namespace: 'dev1',
  context: { combinedId: 'configId:envName' },
  data: { sandboxName: 'theSandbox' },
  loaded: true
};
const mockLoadingEdgeConfig = {
  namespace: 'dev1',
  context: { combinedId: 'configId:envName' },
  loading: true
};
const mockErrorEdgeConfig = {
  namespace: 'dev1',
  context: { combinedId: 'configId:envName' },
  error: { status: 400 }
};

describe('Edge Config Validator', () => {
  it('should pass happy path', () => {
    const results = validator([
      mockValidConfig
    ], {}, [
      mockValidCompany,
      mockValidEdgeConfig
    ]);
    expect(results?.result).toBe('matched');
  });
  describe('Loading', () => {
    it('is unknown with missing connectors', () => {
      const results = validator([
        mockValidConfig
      ], {}, [
        mockValidCompany
      ]);
      expect(results?.result).toBe('unknown');
    });
    it('shows loading for edge config', () => {
      const results = validator([
        mockValidConfig
      ], {}, [
        mockLoadingEdgeConfig
      ]);
      expect(results?.result).toBe('loading');
      expect(results?.message).toBe('Loading Edge Configuration');
    });
  });
  describe('not matched', () => {
    it('fails with no edge configid', () => {
      const results = validator([
        mockInvalidConfig
      ], {}, [
        mockValidEdgeConfig
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('Edge Not Configured');

    });
    it('shows error for edge config load error', () => {
      const results = validator([
        mockValidConfig
      ], {}, [
        mockErrorEdgeConfig
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('Error Loading Edge Configuration');
      expect(results?.events[0]).toBe(mockValidConfig);
      expect(results?.links).toBeFalsy();
    });
    it('shows links if company is loaded', () => {
      const results = validator([
        mockInvalidConfig
      ], {}, [
        mockValidCompany
      ]);
      expect(results?.links?.[0].link).toBe('https://experience.adobe.com/launch/companies/mockCompanyId/properties/mockPropertyId/extensions/catalog');
    });
  });
});

