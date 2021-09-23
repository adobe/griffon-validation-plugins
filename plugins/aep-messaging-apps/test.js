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

const mockValidProperty = sharedState.mock({
  clientId: 'test',
  stateData: { 'property.id': 'mockPropertyId' }
});
const mockEcid = sharedState.mock({
  clientId: 'test',
  xdm: { identityMap: { ECID: [{ id: 'mockEcid' }] } }
});

const mockValidCompany = {
  namespace: 'dev2',
  context: { propertyId: 'mockPropertyId' },
  data: { companyId: 'mockCompanyId' },
  loaded: true
};
const mockValidProfile = {
  namespace: 'dev6',
  context: { ecid: 'mockEcid' },
  data: { pushDetails: { platform: 'apple', appID: 'mockAppID' } },
  loaded: true
};
const mockValidApps = {
  namespace: 'dev3',
  context: { companyId: 'mockCompanyId' },
  data: [{ messaging_service: 'apple', app_id: 'mockAppID' }],
  loaded: true
};
const mockInvalidApps = {
  namespace: 'dev3',
  context: { companyId: 'mockCompanyId' },
  data: [{ messaging_service: 'apple', app_id: 'notTheRightId' }],
  loaded: true
};
const mockEmptyApps = {
  namespace: 'dev3',
  context: { companyId: 'mockCompanyId' },
  data: [],
  loaded: true
};
const mockLoadingCompany = {
  namespace: 'dev2',
  context: { propertyId: 'mockPropertyId' },
  loading: true
};
const mockLoadingProfile = {
  namespace: 'dev6',
  context: { ecid: 'mockEcid' },
  loading: true
};
const mockLoadingApps = {
  namespace: 'dev3',
  context: { companyId: 'mockCompanyId' },
  loading: true
};
const mockErrorCompany = {
  namespace: 'dev2',
  context: { propertyId: 'mockPropertyId' },
  error: true
};
const mockErrorProfile = {
  namespace: 'dev6',
  context: { ecid: 'mockEcid' },
  error: { status: 400 }
};
const mockErrorApps = {
  namespace: 'dev3',
  context: { companyId: 'mockCompanyId' },
  error: { status: 403 }
};

describe('Messaging Apps Validator', () => {
  it('should pass happy path', () => {
    const results = validator([
      mockValidProperty,
      mockEcid
    ], {}, [
      mockValidCompany,
      mockValidProfile,
      mockValidApps
    ]);
    expect(results?.result).toBe('matched');
  });
  describe('Loading', () => {
    it('is unknown with missing connectors', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidProfile,
        mockValidApps
      ]);
      expect(results?.result).toBe('unknown');
    });
    it('shows loading for property', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockLoadingCompany,
        mockValidProfile,
        mockValidApps
      ]);
      expect(results?.result).toBe('loading');
      expect(results?.message).toBe('Loading Launch Property');
    });
    it('shows loading for profile', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockLoadingProfile,
        mockValidApps
      ]);
      expect(results?.result).toBe('loading');
      expect(results?.message).toBe('Loading Profile');
    });
    it('shows loading for apps', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockValidProfile,
        mockLoadingApps
      ]);
      expect(results?.result).toBe('loading');
      expect(results?.message).toBe('Loading App Configurations');
    });
  });
  describe('not matched', () => {
    it('fails with no ecid', () => {
      const results = validator([
        mockValidProperty
      ], {}, [
        mockValidCompany,
        mockValidProfile,
        mockValidApps
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('No ECID Detected');
      expect(results?.links[0].link).toBe('https://experience.adobe.com/launch/companies/mockCompanyId/properties/mockPropertyId/extensions/catalog');
    });
    it('shows error for property', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockErrorCompany,
        mockValidProfile,
        mockValidApps
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('Error Loading Launch Property');
      expect(results?.events[0]).toBe(mockValidProperty);
    });
    it('shows error for profile', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockErrorProfile,
        mockValidApps
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('Error Loading Profile');
      expect(results?.events[0]).toBe(mockEcid);
    });
    it('shows error for apps', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockValidProfile,
        mockErrorApps
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('Error Loading App Configurations');
      expect(results?.events[0]).toBe(mockValidProperty);
    });
    it('shows error for no matching apps', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockValidProfile,
        mockInvalidApps
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('No Matching App Detected');
      expect(results?.events[0]).toBe(mockValidProperty);
      expect(results?.links[0].link).toBe('https://experience.adobe.com/data-collection/appConfigurations/companies/mockCompanyId/configurations');
    });
    it('shows error for empty apps', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockValidProfile,
        mockEmptyApps
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('No App Configurations');
      expect(results?.events[0]).toBe(mockValidProperty);
      expect(results?.links[0].link).toBe('https://experience.adobe.com/data-collection/appConfigurations/companies/mockCompanyId/configurations');
    });
  });
});

