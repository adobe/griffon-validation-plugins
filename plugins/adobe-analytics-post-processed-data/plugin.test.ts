import {
  genericTrack,
  GenericTrack,
  lifecycleStart,
  LifecycleStart
} from '@adobe/griffon-toolkit-aep-mobile';
import { ValidationPluginResult } from 'types/validationPlugin';
// @ts-ignore
import plugin from './index';

const genericTrackEvent = genericTrack.mock({
  uuid: '1',
  annotations: [
    {
      type: 'analytics',
      uuid: '1',
      payload: {
        hitDebugMessages: 'Hello there!'
      }
    }
  ]
}) as GenericTrack;

const lifecycleStartEvent = lifecycleStart.mock({
  uuid: '2',
  annotations: [
    {
      type: 'analytics-with-edge',
      uuid: '2',
      payload: {
        hitDebugMessages: 'Hello there!'
      }
    }
  ]
}) as LifecycleStart;

const invalidGenericTrack = genericTrack.mock({
  uuid: '3',
  annotations: [
    {
      type: 'analytics',
      uuid: '3',
      payload: {}
    },
    {
      type: 'something else',
      uuid: '4'
    }
  ]
}) as GenericTrack;

const invalidLifecycleStart = lifecycleStart.mock({
  uuid: '4',
  annotations: [
    {
      type: 'analytics',
      uuid: '4'
    }
  ]
}) as LifecycleStart;

describe('Adobe Analytics Post Processed Data', () => {
  it('should validate the annotation payload is formatted correctly', () => {
    const result: ValidationPluginResult = plugin([
      genericTrackEvent,
      lifecycleStartEvent
    ]);

    expect(result).toMatchObject({
      events: [],
      result: 'matched'
    });
  });

  it('should not validate when the annotation payload is incorrect', () => {
    const result: ValidationPluginResult = plugin([
      genericTrackEvent,
      lifecycleStartEvent,
      invalidGenericTrack,
      invalidLifecycleStart
    ]);

    expect(result).toMatchObject({
      events: ['3', '4'],
      result: 'not matched'
    });
  });
});
