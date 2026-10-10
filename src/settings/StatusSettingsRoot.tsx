import { useEffect, useState, type FormEvent } from "react";
import { localize } from "../i18n.js";
import { resetStatusRows, type StatusRow } from "./status-rows.js";
import {
  DurationCell,
  Header,
  IconChip,
  SettingsForm,
  StatusList,
  StatusRowItem,
  ValueInput,
} from "./StatusSettings.styles.js";

export interface DurationOption {
  value: string;
  label: string;
}

export interface StatusSettingsProps {
  initialRows: StatusRow[];
  durationOptions: DurationOption[];
  onSave: (rows: StatusRow[]) => Promise<void>;
}

/**
 * Positive whole-number input that keeps its own text while typing, so it can be emptied and retyped; only valid
 * values (1 or more) are committed, and blur restores the committed value.
 */
function NumberField({ value, label, onCommit }: { value: number; label: string; onCommit: (value: number) => void }) {
  const [text, setText] = useState(String(value));

  // Follow outside changes (Reset, settings changed elsewhere) unless the text already shows that value.
  useEffect(() => {
    setText((current) => (Number(current) === value ? current : String(value)));
  }, [value]);

  return (
    <ValueInput
      type="number"
      min={1}
      step={1}
      value={text}
      aria-label={label}
      onChange={(event) => {
        const next = event.currentTarget.value;
        setText(next);
        const parsed = Number(next);
        if (next !== "" && Number.isInteger(parsed) && parsed >= 1) onCommit(parsed);
      }}
      onBlur={() => setText(String(value))}
    />
  );
}

export function StatusSettingsRoot({ initialRows, durationOptions, onSave }: StatusSettingsProps) {
  const [rows, setRows] = useState(initialRows);
  const [saving, setSaving] = useState(false);

  // New rows arrive when the setting changed elsewhere; show them instead of saving over that change.
  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const updateRow = (id: string, change: Partial<Pick<StatusRow, "visible" | "duration" | "value">>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...change } : row)));
  };

  const updateValue = (row: StatusRow, field: "start" | "step", value: number) => {
    if (row.value) updateRow(row.id, { value: { ...row.value, [field]: value } });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    void onSave(rows).finally(() => setSaving(false));
  };

  const showInHud = localize("DSEA.Settings.ShowInHud");
  const defaultDuration = localize("DSEA.Settings.DefaultDuration");
  const lockedHint = localize("DSEA.Settings.Locked");
  const startLabel = localize("DSEA.Settings.StartValue");
  const stepLabel = localize("DSEA.Settings.Step");

  return (
    <SettingsForm onSubmit={onSubmit}>
      <p className="hint">{localize("DSEA.Settings.StatusOptions.Hint")}</p>
      <p className="hint">{localize("DSEA.Settings.ClickHint")}</p>
      <Header aria-hidden>
        <span />
        <span>{localize("DSEA.Settings.Status")}</span>
        <span>{showInHud}</span>
        <span>{defaultDuration}</span>
        <span>{startLabel}</span>
        <span>{stepLabel}</span>
      </Header>
      <StatusList>
        {rows.map((row) => (
          <StatusRowItem key={row.id}>
            <IconChip>
              <img src={row.img} alt="" />
            </IconChip>
            <span>{row.name}</span>
            <input
              type="checkbox"
              checked={row.visible}
              aria-label={`${showInHud}: ${row.name}`}
              onChange={(event) => updateRow(row.id, { visible: event.currentTarget.checked })}
            />
            <DurationCell data-tooltip-text={row.locked ? lockedHint : undefined}>
              <select
                value={row.duration}
                disabled={row.locked}
                aria-label={`${defaultDuration}: ${row.name}`}
                onChange={(event) => updateRow(row.id, { duration: event.currentTarget.value })}
              >
                {durationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </DurationCell>
            {row.value ? (
              <>
                <NumberField
                  value={row.value.start}
                  label={`${startLabel}: ${row.name}`}
                  onCommit={(value) => updateValue(row, "start", value)}
                />
                <NumberField
                  value={row.value.step}
                  label={`${stepLabel}: ${row.name}`}
                  onCommit={(value) => updateValue(row, "step", value)}
                />
              </>
            ) : (
              <>
                <span />
                <span />
              </>
            )}
          </StatusRowItem>
        ))}
      </StatusList>
      <footer className="form-footer">
        <button type="button" onClick={() => setRows((current) => resetStatusRows(current))}>
          <i className="fa-solid fa-arrow-rotate-left" aria-hidden />
          <span>{localize("DSEA.Settings.Reset")}</span>
        </button>
        <button type="submit" disabled={saving}>
          <i className="fa-solid fa-floppy-disk" aria-hidden />
          <span>{localize("DSEA.Settings.Save")}</span>
        </button>
      </footer>
    </SettingsForm>
  );
}
