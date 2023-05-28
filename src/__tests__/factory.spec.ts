import factory from '../factory.js';
import Mock from '../mock.js';

it('returns a moxied target', () => {
  const target = { foo: 'bar' };
  const moxied = factory()(target);

  expect(moxied).toEqual({ foo: 'bar' });
  expect(moxied).not.toBe(target);
  expect(moxied.mock).toBeInstanceOf(Mock);
});

it('returns a moxied empty function if no target provided', () => {
  const moxied = factory()();

  expect(typeof moxied).toBe('function');
  expect(moxied.length).toBe(0);
  expect(moxied()).toBe(undefined);
  expect(moxied.mock).toBeInstanceOf(Mock);
});

it('use default options provided to create Mock', () => {
  const options = {
    accessKey: 'myMock',
    middlewares: [(handler: ProxyHandler<any>) => handler],
    mockReturn: false,
    mockNewInstance: false,
    mockMethod: false,
    includeProperties: ['foo'],
    excludeProperties: ['bar'],
    recordGetter: true,
    recordSetter: true,
  };

  const moxied = factory(options)({});

  expect((moxied as any).myMock.options).toEqual(options);
});

it('use create time options provided to create Mock', () => {
  const options = {
    accessKey: 'myMock',
    middlewares: [(handler: ProxyHandler<any>) => handler],
    mockReturn: false,
    mockNewInstance: false,
    mockMethod: false,
    includeProperties: ['foo'],
    excludeProperties: ['bar'],
    recordGetter: true,
    recordSetter: true,
  };

  const moxied = factory()({}, options);

  expect((moxied as any).myMock.options).toEqual(options);
});

it('extends the default options with create time options', () => {
  const defaultOptions = {
    accessKey: 'myMock',
    middlewares: [(handler: ProxyHandler<any>) => handler],
    mockReturn: false,
    mockNewInstance: false,
    includeProperties: ['foo'],
    recordGetter: true,
  };

  const createTimeOptions = {
    accessKey: 'myOwnMock',
    mockNewInstance: true,
    mockMethod: true,
    excludeProperties: ['bar'],
    recordSetter: true,
  };

  const moxied = factory(defaultOptions)({}, createTimeOptions);

  expect((moxied as any).myOwnMock.options).toEqual({
    accessKey: 'myOwnMock',
    middlewares: defaultOptions.middlewares,
    mockReturn: false,
    mockNewInstance: true,
    mockMethod: true,
    includeProperties: ['foo'],
    excludeProperties: ['bar'],
    recordGetter: true,
    recordSetter: true,
  });
});

it('concat the array options', () => {
  const defaultOptions = {
    middlewares: [(handler: ProxyHandler<any>) => handler],
    includeProperties: ['foo1', 'foo2'],
    excludeProperties: ['bar1'],
  };

  const createTimeOptions = {
    middlewares: [(handler: ProxyHandler<any>) => handler],
    includeProperties: ['foo3'],
    excludeProperties: ['bar2', 'bar3'],
  };

  const moxied = factory(defaultOptions)({}, createTimeOptions);

  expect(moxied.mock.options).toEqual({
    accessKey: 'mock',
    middlewares: [
      defaultOptions.middlewares[0],
      createTimeOptions.middlewares[0],
    ],
    mockReturn: false,
    mockNewInstance: true,
    mockMethod: true,
    includeProperties: ['foo1', 'foo2', 'foo3'],
    excludeProperties: ['bar1', 'bar2', 'bar3'],
    recordGetter: false,
    recordSetter: true,
  });
});
