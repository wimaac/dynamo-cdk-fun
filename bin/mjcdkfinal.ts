#!/usr/bin/env node

import 'source-map-support/register';

import { App } from '@aws-cdk/core';

import { MjcdkfinalStack } from '../lib/mjcdkfinal-stack';

const app = new App();
new MjcdkfinalStack(app, 'MjcdkfinalStack');
