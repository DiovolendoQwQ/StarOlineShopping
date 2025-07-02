# Installation
> `npm install --save @types/type-is`

# Summary
This package contains type definitions for type-is (https://github.com/jshttp/type-is#readme).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/type-is.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/type-is/index.d.ts)
````ts
/// <reference types="node" />
import { IncomingMessage } from "http";

export = typeIs;

declare function typeIs(request: IncomingMessage, types: string[]): string | false | null;
declare function typeIs(request: IncomingMessage, ...types: string[]): string | false | null;

declare namespace typeIs {
    function normalize(type: string): string | false;
    function hasBody(request: IncomingMessage): boolean;
    function is(mediaType: string, types: string[]): string | false;
    function is(mediaType: string, ...types: string[]): string | false;
    function mimeMatch(expected: false | string, actual: string): boolean;
}

````

### Additional Details
 * Last updated: Tue, 07 Nov 2023 15:11:36 GMT
 * Dependencies: [@types/node](https://npmjs.com/package/@types/node)

# Credits
These definitions were written by [BendingBender](https://github.com/BendingBender).
