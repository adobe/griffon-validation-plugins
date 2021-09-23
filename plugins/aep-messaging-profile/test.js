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

// EVENTS
const mockValidProperty = sharedState.mock({
  clientId: 'test',
  stateData: { 'property.id': 'mockPropertyId', pushidentifier: 'abcdefg', 'edge.configId': 'configId:envName' }
});
const mockNoPush = sharedState.mock({
  clientId: 'test',
  stateData: { 'property.id': 'mockPropertyId', 'edge.configId': 'configId:envName' }
});
const mockNoEdge = sharedState.mock({
  clientId: 'test',
  stateData: { 'property.id': 'mockPropertyId', pushidentifier: 'abcdefg' }
});

const mockEcid = sharedState.mock({
  clientId: 'test',
  xdm: { identityMap: { ECID: [{ id: 'mockEcid' }] } }
});


// CONNECTORS
const mockValidCompany = {
  namespace: 'dev2',
  context: { propertyId: 'mockPropertyId' },
  data: { companyId: 'mockCompanyId' },
  loaded: true
};
const mockValidEdgeConfig = {
  namespace: 'dev1',
  context: { combinedId: 'configId:envName' },
  data: { profileSchema: 'http://www.schema.com' },
  loaded: true
};
const mockValidProfile = {
  namespace: 'dev6',
  context: { ecid: 'mockEcid' },
  data: { pushDetails: { platform: 'apple', appID: 'mockAppID', token: 'abcdefg' } },
  loaded: true
};
const mockValidSchema = {
  namespace: 'dev4',
  context: { schemaUrl: 'http://www.schema.com' },
  data: { extends: [
    'https://ns.adobe.com/xdm/extra',
    'https://ns.adobe.com/xdm/context/identitymap',
    'https://ns.adobe.com/xdm/context/profile-push-notification-details'
  ] },
  loaded: true
};

const mockLoadingEdgeConfig = {
  namespace: 'dev1',
  context: { combinedId: 'configId:envName' },
  loading: true
};
const mockLoadingProfile = {
  namespace: 'dev6',
  context: { ecid: 'mockEcid' },
  loading: true
};
const mockLoadingSchema = {
  namespace: 'dev4',
  context: { schemaUrl: 'http://www.schema.com' },
  loading: true
};

const mockErrorEdgeConfig = {
  namespace: 'dev1',
  context: { combinedId: 'configId:envName' },
  error: { status: 400 }
};
const mockErrorProfile = {
  namespace: 'dev6',
  context: { ecid: 'mockEcid' },
  error: { status: 400 }
};
const mockErrorSchema = {
  namespace: 'dev4',
  context: { schemaUrl: 'http://www.schema.com' },
  error: { status: 400 }
};
const mockSchemaMissingMixin = {
  namespace: 'dev4',
  context: { schemaUrl: 'http://www.schema.com' },
  data: { extends: [
    'https://ns.adobe.com/xdm/extra',
    'https://ns.adobe.com/xdm/context/profile-push-notification-details'
  ] },
  loaded: true
};
const mockProfileMismatched = {
  namespace: 'dev6',
  context: { ecid: 'mockEcid' },
  data: { pushDetails: { platform: 'apple', appID: 'mockAppID', token: 'qrstuv' } },
  loaded: true
};

describe('Messaging Profile Validator', () => {
  it('should pass happy path', () => {
    const results = validator([
      mockValidProperty,
      mockEcid
    ], {}, [
      mockValidCompany,
      mockValidEdgeConfig,
      mockValidProfile,
      mockValidSchema
    ]);
    expect(results?.result).toBe('matched');
  });
  describe('Loading', () => {
    it('is unknown with missing connectors', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockValidProfile,
        mockValidSchema
      ]);
      expect(results?.result).toBe('unknown');
    });
    it('shows loading for edge config', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockLoadingEdgeConfig,
        mockValidProfile,
        mockValidSchema
      ]);
      expect(results?.result).toBe('loading');
      expect(results?.message).toBe('Loading Edge Configuration');
    });
    it('shows loading for profile', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockValidEdgeConfig,
        mockLoadingProfile,
        mockValidSchema
      ]);
      expect(results?.result).toBe('loading');
      expect(results?.message).toBe('Loading Profile');
    });
    it('shows loading for schema', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockValidEdgeConfig,
        mockValidProfile,
        mockLoadingSchema
      ]);
      expect(results?.result).toBe('loading');
      expect(results?.message).toBe('Loading Profile Schema');
    });
  });
  describe('not matched', () => {
    it('fails with no ecid', () => {
      const results = validator([
        mockValidProperty
      ], {}, [
        mockValidCompany,
        mockValidEdgeConfig,
        mockValidProfile,
        mockValidSchema
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('No ECID Detected');
      expect(results?.links[0]?.link).toBe('https://experience.adobe.com/launch/companies/mockCompanyId/properties/mockPropertyId/extensions/catalog');
      expect(results?.links[1]?.link).toBe('https://experience.adobe.com/launch/companies/mockCompanyId/properties/mockPropertyId/publishing');
    });
    it('fails with no token', () => {
      const results = validator([
        mockNoPush,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockValidEdgeConfig,
        mockValidProfile,
        mockValidSchema
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('Push Token Not Captured');
    });
    it('fails with no edge config', () => {
      const results = validator([
        mockNoEdge,
        mockEcid
      ], {}, [
        mockValidEdgeConfig,
        mockValidProfile,
        mockValidSchema
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('Edge Not Configured');
      expect(results?.links).toBeFalsy(); // no links cause no company
    });
    it('shows error for profile', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockValidEdgeConfig,
        mockErrorProfile,
        mockValidSchema
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('Error Loading Profile');
      expect(results?.events[0]).toBe(mockEcid);
    });
    it('shows error for edge config', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockErrorEdgeConfig,
        mockValidProfile,
        mockValidSchema
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('Error Loading Edge Configuration');
      expect(results?.events[0]).toBe(mockValidProperty);
    });
    it('shows error for schema', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockValidEdgeConfig,
        mockValidProfile,
        mockErrorSchema
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('Error Loading Profile Schema');
      expect(results?.events[0]).toBe(mockValidProperty);
    });
    it('shows error for schema missing mixins', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockValidEdgeConfig,
        mockValidProfile,
        mockSchemaMissingMixin
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('Invalid Profile Dataset');
      expect(results?.events[0]).toBe(mockValidProperty);
      expect(results?.links[0]?.link).toBe('https://experience.adobe.com/data-collection/dataStreams/companies/mockCompanyId/dataStreams/configId/environments/envName/edit');
    });
    it('shows error for token mismatch', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockValidEdgeConfig,
        mockProfileMismatched,
        mockValidSchema
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('Push Token Mismatch');
      expect(results?.events[0]).toBe(mockValidProperty);
    });
  });
});

