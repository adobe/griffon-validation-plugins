/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/* eslint no-console: 0 */

const { execSync } = require('child_process');
const { readdirSync } = require('fs');
const { resolve } = require('path');
const plugins = require('./process.plugins');

const ZIP_NAME_REGEX = /\.zip$/;

plugins.forEach((plugin) => {
  const packageDir = resolve(__dirname, `../plugins/${plugin}`);

  const packageZips = readdirSync(packageDir)
    .filter(file => ZIP_NAME_REGEX.test(file));

  const cwdOptions = {
    cwd: packageDir,
    stdio: [0, 1, 2]
  };

  if (packageZips.length === 1) {
    execSync(`npx @adobe/griffon-uploader ${packageZips[0]}`, cwdOptions);
  } else {
    const message = packageZips.length === 0 ? `No package zip found for plugin ${plugin}`
      : `Could not determine which package zip to upload for plugin ${plugin}`;
    console.log(message);
  }
});
