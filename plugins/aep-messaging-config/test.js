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
  stateData: { 'property.id': 'mockPropertyId', pushidentifier: 'abcdefg', 'messaging.eventDataset': 'datasetAbc' }
});
const mockNoPush = sharedState.mock({
  clientId: 'test',
  stateData: { 'property.id': 'mockPropertyId', 'messaging.eventdataset': 'datasetAbc' }
});
const mockNoTracking = sharedState.mock({
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
const mockValidDataset = {
  namespace: 'dev5',
  context: { datasetId: 'datasetAbc' },
  data: { schema: 'http://www.schema.com' },
  loaded: true
};
const mockValidSchema = {
  namespace: 'dev4',
  context: { schemaUrl: 'http://www.schema.com' },
  data: { extends: [
    'https://ns.adobe.com/xdm/extra',
    'https://ns.adobe.com/xdm/context/experienceevent-environment-details',
    'https://ns.adobe.com/xdm/context/experienceevent-pushtracking',
    'https://ns.adobe.com/xdm/context/experienceevent-application',
    'https://ns.adobe.com/experience/customerJourneyManagement/messageprofile',
    'https://ns.adobe.com/experience/customerJourneyManagement/messageexecution'
  ] },
  loaded: true
};

const mockLoadingDataset = {
  namespace: 'dev5',
  context: { datasetId: 'datasetAbc' },
  loading: true
};
const mockLoadingSchema = {
  namespace: 'dev4',
  context: { schemaUrl: 'http://www.schema.com' },
  loading: true
};

const mockErrorDataset = {
  namespace: 'dev5',
  context: { datasetId: 'datasetAbc' },
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
    'https://ns.adobe.com/xdm/context/experienceevent-environment-details',
    'https://ns.adobe.com/xdm/context/experienceevent-pushtracking',
    'https://ns.adobe.com/xdm/context/experienceevent-application',
    'https://ns.adobe.com/experience/customerJourneyManagement/messageexecution'
  ] },
  loaded: true
};

describe('Messaging Config Validator', () => {
  it('should pass happy path', () => {
    const results = validator([
      mockValidProperty,
      mockEcid
    ], {}, [
      mockValidCompany,
      mockValidDataset,
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
        mockValidDataset
      ]);
      expect(results?.result).toBe('unknown');
    });
    it('shows loading for the dataset', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockLoadingDataset,
        mockValidSchema
      ]);
      expect(results?.result).toBe('loading');
      expect(results?.message).toBe('Loading Tracking Dataset');
    });
    it('shows loading for schema', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockValidDataset,
        mockLoadingSchema
      ]);
      expect(results?.result).toBe('loading');
      expect(results?.message).toBe('Loading Tracking Schema');
    });
  });
  describe('not matched', () => {
    it('fails with no ecid', () => {
      const results = validator([
        mockValidProperty
      ], {}, [
        mockValidCompany,
        mockValidDataset,
        mockValidSchema
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('No ECID Detected');
    });
    it('fails with no token', () => {
      const results = validator([
        mockNoPush,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockValidDataset,
        mockValidSchema
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('Push Token Not Captured');
    });
    it('fails with no tracking dataset', () => {
      const results = validator([
        mockNoTracking,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockValidDataset,
        mockValidSchema
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('Message Tracking Not Configured');
      expect(results?.links[0]?.link).toBe('https://experience.adobe.com/launch/companies/mockCompanyId/properties/mockPropertyId/extensions/catalog');
    });
    it('shows error for dataset', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockErrorDataset,
        mockValidSchema
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('Error Loading Tracking Dataset');
      expect(results?.events[0]).toBe(mockValidProperty);
    });
    it('shows error for schema', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockValidDataset,
        mockErrorSchema
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('Error Loading Tracking Schema');
      expect(results?.events[0]).toBe(mockValidProperty);
    });
    it('shows error for schema missing mixins', () => {
      const results = validator([
        mockValidProperty,
        mockEcid
      ], {}, [
        mockValidCompany,
        mockValidDataset,
        mockSchemaMissingMixin
      ]);
      expect(results?.result).toBe('not matched');
      expect(results?.message).toBe('Invalid Tracking Dataset');
      expect(results?.events[0]).toBe(mockValidProperty);
    });
  });
});

