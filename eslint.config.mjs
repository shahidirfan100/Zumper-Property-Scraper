import prettier from 'eslint-config-prettier';

import apifyEslintConfig from '@apify/eslint-config';

/* eslint-disable import-x/no-default-export */
export default [
    { ignores: ['**/dist', '**/storage'] },
    ...apifyEslintConfig,
    prettier,
];
