/*
 * ************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 *   Copyright 2020 Adobe Systems Incorporated
 *   All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by all applicable intellectual property
 * laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 * ************************************************************************
 */

import * as toolkit from '@adobe/griffon-toolkit';
import * as aepMobile from '@adobe/griffon-toolkit-aep-mobile';
import * as edge from '@adobe/griffon-toolkit-edge';
import jmespath from 'jmespath';
import joi from 'joi';

const toArray = v => (Array.isArray(v) ? v : [v]);

export const expect = events => ({
  toMatch: (schema) => {
    const results = schema.validate(events);

    const message = !results.error ? 'Valid!' : results.error.message;
    const expression = Array.isArray(events) ? '[*].uuid' : 'uuid';
    const errors = !results.error ? [] : toArray(jmespath.search(events, expression));

    return { message, errors };
  }
});

window.griffon = {
  toolkit: {
    'aep-mobile': aepMobile,
    edge,
    ...toolkit
  },
  schema: {
    ...joi
  },
  expect
};
