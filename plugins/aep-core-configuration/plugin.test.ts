import {
  configuration,
  Configuration
} from '@adobe/griffon-toolkit-aep-mobile';
import { ValidationPluginResult } from 'types/validationPlugin';
// @ts-ignore
import plugin from './index';

const validConfiguration = configuration.mock({
  uuid: '1',
  payload: {
    ACPExtensionEventData: {
      'experienceCloud.org': '123',
      'lifecycle.sessionTimeout': '123'
    }
  }
}) as Configuration;

const invalidConfiguration = configuration.mock({
  uuid: '2',
  payload: {
    ACPExtensionEventData: {
      'experienceCloud.org': '',
      'lifecycle.sessionTimeout': '123'
    }
  }
}) as Configuration;

describe('Adobe Core Configuration', () => {
  it('should return success when core has been configured correctly in at least one event', () => {
    const result: ValidationPluginResult = plugin([
      invalidConfiguration,
      validConfiguration
    ]);

    expect(result).toMatchObject({
      events: [],
      result: 'matched'
    });
  });

  it('should return invalid when core configuration is missing properties', () => {
    const result: ValidationPluginResult = plugin([invalidConfiguration]);

    expect(result).toMatchObject({
      events: ['2'],
      result: 'not matched'
    });
  });
});
