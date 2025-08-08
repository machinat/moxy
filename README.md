<h1 align="center">
<img alt="MOXY" src="./media/logo.png"/>
</h1>

<h4 align="center">Mock EVERYTHING with Proxy!</h3>
<hr/>

## Highlight

- One simple but powerful API
- Mock any `function`, `object` and `class`
- Mock methods
- Mock getters and setters
- Mock any property chain optionally
- Configurable & pluginable

###### Index: [Install](#install) - [Usage](#usage) - [API](#api) - [Advanced Topic](#advanced-topic)

## Install

with npm:

```
npm install @moxyjs/moxy
```

or yarn:

```
yarn add @moxyjs/moxy
```

### Use with Jest

Add the setup file in your jest config like:

```js
module.exports = {
  // ...
  setupFiles: [
    '<rootDir>/node_modules/@moxyjs/moxy/lib/extends/jest.js',
  ],
};
```

### Usage

```js
import moxy from '@moxyjs/moxy';

const spy = moxy(/* anything to mock */);

spy(); // an empty function by default
```

##### Mock a function

```js
const hello = moxy(() => 'world');
hello('foo'); // 'world'

hello.mock.fake(() => 'bar')
hello('foo'); // 'bar'

hello.mock.fakeReturnValue('baz')
hello('foo'); // 'baz'

expect(hello).toHaveBeenCalledTimes(3);
expect(hello).toHaveBeenCalledWith('foo');
```

##### Fake once

```js
const hello = moxy(() => 'world');
hello.mock.fakeReturnValue('foo');

hello.mock.fakeOnce(() => 'bar');
hello.mock.fakeReturnValueOnce('baz');

hello(); // 'bar'
hello(); // 'baz'
hello(); // 'foo'
```

##### Mock an object

```js
const duck = moxy({
  say: () => 'quack',
  swim: true,
});
duck.say('foo'); // 'quack'
duck.swim; // true

duck.say.mock.fakeReturnValue('meow')
duck.say('foo'); // 'meow'

duck.mock.getter('swim').mockReturnValue(false)
duck.swim; // false

expect(duck.say.mock).toHaveBeenCalledWith('foo');
```

##### Mock a class

```js
const Cat = moxy(class Cat {
  say() {
    return 'meow';
  },
});
const cat = new Cat('orange');
cat.say('foo'); // 'meow'

// the instance is mocked
cat.say.mock.fakeReturnValue('purr');
cat.say('foo'); // 'purr'

// fake class implementation
Cat.mock.fakeReturnValue(class NyanCat {
  say() {
    return 'nyan~nyan~nyan~';
  },
});
const cat2 = new Cat('rainbow');
cat2.say('foo'); // 'nyan~nyan~nyan~'

expect(Cat.mock).toHaveBeenCalledTimes(2);
expect(Cat.mock).toHaveBeenCalledWith('rainbow');
expect(cat.say.mock).toHaveBeenCalledTimes(3);
```

## API

#### `moxy(value, options)`

Return the mocked value

- value - `object|function`, the obejct to be mocked, default to `function(){}`.
- options - `object`, the mock options, default to `{}`
  - `accessKey` - `string`, the key to access `Mock` object, default to `'mock'`
  - `mockReturn: true` - `boolean`, whether to mock returned value, default to `false`
  - `mockNewInstance` - `boolean`, whether to mock constructing call, default to `true`,
  - `mockMethod`:`boolean`, whether to mock methods, default to `true`,
  - `recordGetter` - `boolean`, whether to record getter calls, default to `false`,
  - `recordSetter` - `boolean`, whether to record setter calls, default to `true`,
  - `middlewares` - `function[]`, middleware functions, default to `null`,
  - `includeProperties` - `(string|symbol)[]`, mock matched methods and properties, default to `null`
  - `excludeProperties` - `(string|symbol)[]`, exclude matched methods and properties, default to `null`

#### `Mock`

The mocking operator class

- `getCalls()` - return the function `Call` array
- `getter(key)` - return the getter `Mock` of a property
- `setter(key)` - return the setter `Mock` of a property
  - `key` - `string|symbol` - the property name
- `fake(impl)` - fake function call
- `fakeOnce(impl)` - fake function call once
  - `impl` - `function`, the faked implementation
- `fakeReturnValue(value)` - fake returned value
- `fakeReturnValueOnce(value)` - fake returned value
  - `value` - `any`, the faked value
- `wrap(wrapFn)` - wrap function call behavior
- `wrapOnce(wrapFn)` - wrap function call behavior once
  - `wrapFn` - `(originalImpl) => fakedImpl`, receive the original implementation and return the faked one
- `proxify(source)` - return a mocked `Proxy` of the source which is controlled by itself

#### `Call`

A function call record

- `args` - `any[]`, the function call auguments
- `result` - `any`, the returned value or the thrown error. 
- `instance` - `any`, the bound object, i.e. `this`
- `isThrown` - `boolean`, whether the call is thrown
- `isConstructor` - `boolean`, whether it's a constructing call with `new`


#### `isMoxy(value)`

Check whether a value is moxied. Return a `boolean`. For example:

```js
import moxy, { isMoxy } from '@moxyjs/moxy';

isMoxy({}); // false
isMoxy(moxy()); // true
```

- value - `any`, the value to check

#### `factory(options)`

Create a `moxy` function with new default options. For example:

```js
import { factory } from '@moxyjs/moxy';
const moxy = factory({
  recordGetter: true,
  mockReturn: true,
});

const foo = moxy();
const bar = moxy();
```

- options - `object`, the same as options of `moxy`

## Advanced Topic


##### Mock an object deeply

Any property chain matched by `includeProperties` is mocked deeply. The property name is checked using [`micromatch`](https://github.com/micromatch/micromatch).

```js
const obj = moxy(
  {
    foo: {
      bar: {
        baz: {
          hello: () => 'world'
        },
      },
    },
  },
  { includeProperties: ['foo', 'b*'] },
);
obj.foo.bar.baz.hello(); // 'world'

obj.foo.bar.baz.hello.mock.fakeReturnValue('there');
obj.foo.bar.baz.hello(); // 'there'
```

##### Use one `Mock` to mock many instances

This is useful to mock all instances of a class:

```js
import moxy, { Mock, trackConstructedInstances } from '@moxyjs/moxy';

const fooMock = new Mock();
const Foo = moxy(
  class Foo {
    bar() {
      return 'baz';
    }
  },
  { middlewares: [trackConstructedInstances(fooMock)] } // track all instances created by Foo
);

new Foo().bar(); // 'baz'

fooMock.getter('bar').fakeReturnValue('zaq');
new Foo().bar(); // 'zaq'
```

Or to mock a curried function:

```js
import moxy, { trackFunctionApplyChain } from '@moxyjs/moxy';

const curriedFn = moxy(
  () => () => () => '🍛',
  { middlewares: [trackFunctionApplyChain()] },
);

curriedFn('foo')('bar')('baz'); // '🍛'

expect(mock).toHaveBeenNthCalledWith([['foo'], ['bar'], ['baz']]);
```

##### Proxy Handle Middleware

You can define the underlying [proxy handler](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy#handler_functions) with the `middlewares` option. For example:

```js
const foo = moxy({ bar: 'baz' }, {
  middlewares: [
    (handler) => ({
      ...handler,
      deleteProperty(target, prop) {
        target[prop] = 'deleted';
      },
    })
  ],
});

delete foo.bar;
foo.bar; // 'deleted'
```
