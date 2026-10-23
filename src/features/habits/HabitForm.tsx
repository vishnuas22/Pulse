import { useState, type FormEvent } from 'react';
import { ApiError } from '@/api/error';
import { ACCENTS, NAME_MAX, NOTES_MAX, type AccentKey, type Habit, type NewHabit } from '@/api/types';
import { ACCENT_CLASSES } from '@/lib/accents';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/Button';
import { Field, Input, NumberField, Textarea } from '@/ui/Inputs';
import { Spinner } from '@/ui/Spinner';

interface FormValues {
  name: string;
  notes: string;
  accent: AccentKey;
  targetPerWeek: number;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  const name = values.name.trim();
  if (name.length === 0) errors.name = 'Add a name.';
  else if (name.length > NAME_MAX) errors.name = `Keep the name under ${NAME_MAX} characters.`;
  if (values.notes.length > NOTES_MAX) errors.notes = `Keep notes under ${NOTES_MAX} characters.`;
  return errors;
}

export function HabitForm({
  habit,
  onSubmit,
  onCancel,
}: {
  habit?: Habit;
  onSubmit: (input: NewHabit) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<FormValues>(
    habit
      ? { name: habit.name, notes: habit.notes ?? '', accent: habit.accent, targetPerWeek: habit.targetPerWeek }
      : { name: '', notes: '', accent: 'ember', targetPerWeek: 7 },
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setApiError(null);
    setSaving(true);
    try {
      await onSubmit({
        name: values.name.trim(),
        notes: values.notes.trim() === '' ? undefined : values.notes.trim(),
        accent: values.accent,
        targetPerWeek: values.targetPerWeek,
      });
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {apiError && (
        <p role="alert" className="rounded-input border border-accent/40 bg-[var(--paper)] px-3 py-2 text-[13px] text-accent">
          {apiError}
        </p>
      )}

      <Field label="Name" htmlFor="habit-name" hint={`${NAME_MAX} max`} error={errors.name}>
        <Input
          id="habit-name"
          data-autofocus
          value={values.name}
          invalid={Boolean(errors.name)}
          maxLength={NAME_MAX + 40}
          placeholder="Morning run"
          aria-describedby={errors.name ? 'habit-name-error' : undefined}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        />
      </Field>

      <Field label="Notes" htmlFor="habit-notes" hint="optional" error={errors.notes}>
        <Textarea
          id="habit-notes"
          value={values.notes}
          invalid={Boolean(errors.notes)}
          maxLength={NOTES_MAX + 40}
          placeholder="Where, when, and what counts."
          aria-describedby={errors.notes ? 'habit-notes-error' : undefined}
          onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
        />
      </Field>

      <Field label="Times per week">
        <NumberField
          label="Times per week"
          value={values.targetPerWeek}
          min={1}
          max={7}
          onChange={(n) => setValues((v) => ({ ...v, targetPerWeek: n }))}
        />
      </Field>

      <Field label="Accent">
        <div role="radiogroup" aria-label="Accent color" className="flex gap-2.5 pt-1">
          {ACCENTS.map((a) => {
            const selected = values.accent === a;
            return (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={a}
                title={a}
                onClick={() => setValues((v) => ({ ...v, accent: a }))}
                className={cn(
                  'size-6 rounded-full border-2 transition-[border-color,transform] duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)]',
                  ACCENT_CLASSES[a].dot,
                  selected ? 'scale-110 border-ink' : 'border-transparent hover:opacity-80',
                )}
              />
            );
          })}
        </div>
      </Field>

      <div className="mt-1 flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Spinner className="size-3.5 border-t-white/70" />}
          {habit ? 'Save changes' : 'Create habit'}
        </Button>
      </div>
    </form>
  );
}
