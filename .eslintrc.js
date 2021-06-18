module.exports = {
    'env': {
        'commonjs': true,
        'es2021': true,
        'node': true
    },
    'extends': 'eslint:recommended',
    'parserOptions': {
        'ecmaVersion': 12
    },
    'rules': {
        "accessor-pairs": "warn",
        "array-callback-return": "warn",
        "arrow-parens": "warn",
        "arrow-spacing": "warn",
        "block-scoped-var": "warn",
        "block-spacing": "warn",
        "brace-style": "warn",
        "callback-return": "warn",
        "camelcase": "warn",
        "comma-dangle": "warn",
        "comma-spacing": [
            "warn",
            {
                "after": true,
                "before": false
            }
        ],
        "comma-style": "warn",
        "computed-property-spacing": [
            "warn",
            "never"
        ],
        "consistent-this": "warn",
        "dot-notation": [
            "warn",
            {
                "allowKeywords": true
            }
        ],
        "eol-last": [
            "warn",
            "never"
        ],
        "eqeqeq": "warn",
        "func-call-spacing": "warn",
        "func-name-matching": "warn",
        "func-names": "warn",
        "func-style": "warn",
        "function-paren-newline": "warn",
        "generator-star-spacing": "warn",
        "grouped-accessor-pairs": "warn",
        "guard-for-in": "warn",
        "handle-callback-err": "warn",
        "id-blacklist": "warn",
        "id-match": "warn",
        "implicit-arrow-linebreak": "warn",
        "indent": [
            "warn",
            4,
            {
                "SwitchCase": 1
            }
        ],
        "init-declarations": "warn",
        "jsx-quotes": "warn",
        "key-spacing": "warn",
        "linebreak-style": [
            "warn",
            "windows"
        ],
        "lines-around-comment": "warn",
        "lines-around-directive": "warn",
        "lines-between-class-members": [
            "warn",
            "always"
        ],
        "max-classes-per-file": "warn",
        "max-nested-callbacks": "warn",
        "new-parens": "warn",
        "no-alert": "warn",
        "no-array-constructor": "warn",
        "no-bitwise": "warn",
        "no-buffer-constructor": "warn",
        "no-caller": "warn",
        "no-console": "warn",
        "no-div-regex": "warn",
        "no-dupe-else-if": "warn",
        "no-duplicate-imports": "warn",
        "no-else-return": "warn",
        "no-empty-function": "warn",
        "no-eq-null": "warn",
        "no-eval": "warn",
        "no-extend-native": "warn",
        "no-extra-bind": "warn",
        "no-extra-label": "warn",
        "no-extra-parens": "warn",
        "no-floating-decimal": "warn",
        "no-implicit-coercion": "warn",
        "no-implicit-globals": "warn",
        "no-implied-eval": "warn",
        "no-import-assign": "warn",
        "no-invalid-this": "warn",
        "no-iterator": "warn",
        "no-label-var": "warn",
        // "no-labels": "warn",
        "no-lone-blocks": "warn",
        "no-loop-func": "warn",
        "no-mixed-requires": "warn",
        "no-multi-assign": "warn",
        "no-multi-spaces": "warn",
        "no-multi-str": "warn",
        "no-multiple-empty-lines": "warn",
        "no-native-reassign": "warn",
        "no-negated-in-lhs": "warn",
        "no-nested-ternary": "warn",
        "no-new": "warn",
        "no-new-func": "warn",
        "no-new-object": "warn",
        "no-new-require": "warn",
        "no-new-wrappers": "warn",
        "no-octal-escape": "warn",
        "no-path-concat": "warn",
        "no-process-exit": "warn",
        "no-proto": "warn",
        "no-restricted-globals": "warn",
        "no-restricted-imports": "warn",
        "no-restricted-modules": "warn",
        "no-restricted-properties": "warn",
        "no-restricted-syntax": "warn",
        "no-return-assign": "warn",
        "no-return-await": "warn",
        "no-script-url": "warn",
        "no-self-compare": "warn",
        "no-sequences": "warn",
        "no-setter-return": "warn",
        "no-spaced-func": "warn",
        "no-tabs": "warn",
        "no-template-curly-in-string": "warn",
        "no-throw-literal": "warn",
        "no-undef-init": "warn",
        "no-unmodified-loop-condition": "warn",
        "no-unneeded-ternary": "warn",
        "no-unused-expressions": "warn",
        "no-use-before-define": "warn",
        "no-useless-call": "warn",
        "no-useless-computed-key": "warn",
        "no-useless-concat": "warn",
        "no-useless-constructor": "warn",
        "no-useless-rename": "warn",
        "no-useless-return": "warn",
        "no-var": "warn",
        "no-void": "warn",
        "no-whitespace-before-property": "warn",
        "nonblock-statement-body-position": "warn",
        "object-curly-spacing": [
            "warn",
            "always"
        ],
        "object-shorthand": "warn",
        "one-var-declaration-per-line": "warn",
        "operator-assignment": "warn",
        "padding-line-between-statements": "warn",
        "prefer-arrow-callback": "warn",
        "prefer-const": "warn",
        "prefer-destructuring": "warn",
        "prefer-exponentiation-operator": "warn",
        "prefer-numeric-literals": "warn",
        "prefer-object-spread": "warn",
        "prefer-promise-reject-errors": "warn",
        "prefer-regex-literals": "warn",
        "prefer-rest-params": "warn",
        "prefer-spread": "warn",
        "require-jsdoc": "warn",
        "require-unicode-regexp": "warn",
        "rest-spread-spacing": "warn",
        "semi": "warn",
        "semi-spacing": "warn",
        "semi-style": [
            "warn",
            "last"
        ],
        "space-before-blocks": "warn",
        "space-in-parens": [
            "warn",
            "never"
        ],
        "switch-colon-spacing": "warn",
        "symbol-description": "warn",
        "template-curly-spacing": [
            "warn",
            "never"
        ],
        "template-tag-spacing": "warn",
        "unicode-bom": [
            "warn",
            "never"
        ],
        "vars-on-top": "warn",
        "wrap-iife": "warn",
        "wrap-regex": "warn",
        "yield-star-spacing": "warn",
        "yoda": [
            "warn",
            "never"
        ]
    }
};