/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useRef, useState } from 'react';
import { UserWarning } from './UserWarning';
import {
  getTodos,
  createTodo,
  deleteTodo,
  updateTodo,
  USER_ID,
} from './api/todos';
import { NewTodoForm } from './components/NewTodoForm';
import { Todo } from './types/Todo';
import { TodoList } from './components/TodoList';
import { Filter, FILTERS } from './types/Filters';
import { ErrorNotification } from './components/ErrorNotification';
import { FilterComponent } from './components/FilterComponent';
import classNames from 'classnames';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState<string | null>(null);

  // Ref do focusowania inputa
  const todoFieldRef = useRef<HTMLInputElement>(null);

  const focusField = () => {
    todoFieldRef.current?.focus();
  };

  //error
  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 3000);
  };

  // Wczytywanie todos
  useEffect(() => {
    if (!USER_ID) {
      return;
    }

    getTodos()
      .then(setTodos)
      .catch(() => showError('Unable to load todos'))
      .finally(focusField);
  }, []);

  const handleAdd = async (title: string): Promise<boolean> => {
    const trimmedTitle = title.trim();

    // Walidacja pustego tytułu
    if (!trimmedTitle) {
      showError('Title should not be empty');
      focusField();

      return false;
    }

    setTempTodo({
      id: 0,
      userId: USER_ID,
      title: trimmedTitle,
      completed: false,
    });

    try {
      const newTodo = await createTodo({ title: trimmedTitle });

      setTodos(current => [...current, newTodo]);
      setTempTodo(null);
      setTimeout(focusField, 10);

      return true;
    } catch {
      showError('Unable to add a todo');
      setTempTodo(null);
      setTimeout(focusField, 10);

      return false;
    }
  };

  const handleDelete = async (id: number) => {
    setLoadingIds(prev => [...prev, id]);
    try {
      await deleteTodo(id);
      setTodos(prev => prev.filter(t => t.id !== id));
      setTimeout(focusField, 10);
    } catch {
      showError('Unable to delete a todo');
    } finally {
      setLoadingIds(prev => prev.filter(lid => lid !== id));
    }
  };

  const handleUpdate = async (id: number, data: Partial<Todo>) => {
    setLoadingIds(prev => [...prev, id]);
    try {
      const updatedTodo = await updateTodo(id, data);

      setTodos(current => current.map(t => (t.id === id ? updatedTodo : t)));
    } catch (err) {
      showError('Unable to update a todo');
      throw err;
    } finally {
      setLoadingIds(prev => prev.filter(lid => lid !== id));
    }
  };

  const handleToggleAll = async () => {
    const allCompleted = todos.every(todo => todo.completed);
    const targetStatus = !allCompleted;
    const toUpdate = todos.filter(todo => todo.completed !== targetStatus);

    await Promise.all(
      toUpdate.map(todo => handleUpdate(todo.id, { completed: targetStatus })),
    );
  };

  const handleClearCompleted = async () => {
    const completedTodos = todos.filter(t => t.completed);

    // Wykonujemy wszystkie usunięcia równolegle
    await Promise.allSettled(completedTodos.map(todo => handleDelete(todo.id)));
    focusField();
  };

  // Filtrowanie todos
  const filteredTodos =
    filter === FILTERS.all
      ? todos
      : filter === FILTERS.active
        ? todos.filter(t => !t.completed)
        : todos.filter(t => t.completed);

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {todos.length > 0 && (
            <button
              type="button"
              className={classNames('todoapp__toggle-all', {
                active: todos.every(t => t.completed),
              })}
              data-cy="ToggleAllButton"
              onClick={handleToggleAll}
            />
          )}
          <NewTodoForm
            onAdd={handleAdd}
            loading={!!tempTodo}
            todoFieldRef={todoFieldRef}
          />
        </header>

        <TodoList
          todos={filteredTodos}
          tempTodo={tempTodo}
          loadingIds={loadingIds}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />

        {/* Footer */}
        {(todos.length > 0 || tempTodo) && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {todos.filter(t => !t.completed).length} items left
            </span>
            <FilterComponent current={filter} onChange={setFilter} />
            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={!todos.some(t => t.completed)}
              onClick={handleClearCompleted}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      <ErrorNotification message={error} onClose={() => setError(null)} />
    </div>
  );
};
