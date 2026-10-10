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

export function StatusSettingsRoot({ initialRows, durationOptions, onSave }: StatusSettingsProps) {
  const [rows, setRows] = useState(initialRows);
  const [saving, setSaving] = useState(false);

  // New rows arrive when the setting changed elsewhere; show them instead of saving over that change.
  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const updateRow = (id: string, change: Partial<Pick<StatusRow, "visible" | "duration">>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...change } : row)));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    void onSave(rows).finally(() => setSaving(false));
  };

  const showInHud = localize("DSEA.Settings.ShowInHud");
  const defaultDuration = localize("DSEA.Settings.DefaultDuration");
  const lockedHint = localize("DSEA.Settings.Locked");

  return (
    <SettingsForm onSubmit={onSubmit}>
      <p className="hint">{localize("DSEA.Settings.StatusOptions.Hint")}</p>
      <Header aria-hidden>
        <span />
        <span>{localize("DSEA.Settings.Status")}</span>
        <span>{showInHud}</span>
        <span>{defaultDuration}</span>
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
