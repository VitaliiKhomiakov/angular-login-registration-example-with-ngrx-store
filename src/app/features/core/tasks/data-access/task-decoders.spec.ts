import { decodeTask, decodeTasks, TasksApiContractError } from './task-decoders';

describe('Task response contracts', () => {
  it('projects only task fields and supports an empty list', () => {
    expect(decodeTask({ id: 1, title: 'Read the example', completed: false, userId: 42 })).toEqual({
      id: 1,
      title: 'Read the example',
      completed: false,
    });
    expect(decodeTasks([])).toEqual([]);
    expect(decodeTasks([{ id: 2, title: 'x'.repeat(120), completed: true }])).toEqual([
      { id: 2, title: 'x'.repeat(120), completed: true },
    ]);
  });

  it.each([
    null,
    [],
    'task',
    {},
    { id: 0, title: 'Task', completed: false },
    { id: -1, title: 'Task', completed: false },
    { id: 1.5, title: 'Task', completed: false },
    { id: Number.MAX_SAFE_INTEGER + 1, title: 'Task', completed: false },
    { id: '1', title: 'Task', completed: false },
    { id: 1, title: '   ', completed: false },
    { id: 1, title: 'x'.repeat(121), completed: false },
    { id: 1, title: null, completed: false },
    { id: 1, title: 'Task', completed: 'false' },
    { id: 1, title: 'Task' },
  ])('rejects a malformed record %#', (value) => {
    expect(() => decodeTask(value)).toThrow(TasksApiContractError);
  });

  it('rejects a malformed list or duplicate identity without leaking received data', () => {
    for (const value of [
      null,
      {},
      [null],
      [
        { id: 1, title: 'private-title', completed: false },
        { id: 1, title: 'duplicate', completed: true },
      ],
    ]) {
      expect(() => decodeTasks(value)).toThrow(TasksApiContractError);
      expect(() => decodeTasks(value)).not.toThrow('private-title');
    }
  });
});
