import factory from '../factory';
import Mock from '../mock';

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
    mockAccessKey: 'myMock',
    middlewares: [handler => handler],
    mockReturnValue: false,
    mockNewInstance: false,
    mockProperty: false,
    includeProps: ['foo'],
    excludeProps: ['bar'],
    recordGetter: true,
    recordSetter: true,
  };

  const moxied = factory()({}, options);

  expect(moxied.myMock.options).toEqual(options);
});

it('use create time options provided to create Mock', () => {
  const options = {
    mockAccessKey: 'myMock',
    middlewares: [handler => handler],
    mockReturnValue: false,
    mockNewInstance: false,
    mockProperty: false,
    includeProps: ['foo'],
    excludeProps: ['bar'],
    recordGetter: true,
    recordSetter: true,
  };

  const moxied = factory()({}, options);

  expect(moxied.myMock.options).toEqual(options);
});

it('extends the default options with create time options', () => {
  const defaultOptions = {
    mockAccessKey: 'myMock',
    middlewares: [handler => handler],
    mockReturnValue: false,
    mockNewInstance: false,
    includeProps: ['foo'],
    recordGetter: true,
  };

  const createTimeOptions = {
    mockAccessKey: 'myOwnMock',
    mockNewInstance: true,
    mockProperty: true,
    excludeProps: ['bar'],
    recordSetter: true,
  };

  const moxied = factory(defaultOptions)({}, createTimeOptions);

  expect(moxied.myOwnMock.options).toEqual({
    mockAccessKey: 'myOwnMock',
    middlewares: defaultOptions.middlewares,
    mockReturnValue: false,
    mockNewInstance: true,
    mockProperty: true,
    includeProps: ['foo'],
    excludeProps: ['bar'],
    recordGetter: true,
    recordSetter: true,
  });
});

it('concat the array options', () => {
  const defaultOptions = {
    middlewares: [handler => handler],
    includeProps: ['foo1', 'foo2'],
    excludeProps: ['bar1'],
  };

  const createTimeOptions = {
    middlewares: [handler => handler],
    includeProps: ['foo3'],
    excludeProps: ['bar2', 'bar3'],
  };

  const moxied = factory(defaultOptions)({}, createTimeOptions);

  expect(moxied.mock.options).toEqual({
    mockAccessKey: 'mock',
    middlewares: [
      defaultOptions.middlewares[0],
      createTimeOptions.middlewares[0],
    ],
    mockReturnValue: false,
    mockNewInstance: true,
    mockProperty: true,
    includeProps: ['foo1', 'foo2', 'foo3'],
    excludeProps: ['bar1', 'bar2', 'bar3'],
    recordGetter: false,
    recordSetter: false,
  });
});
