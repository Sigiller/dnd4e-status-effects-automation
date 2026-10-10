import styled, { createGlobalStyle, css } from "styled-components";

/** Window frame: let the React root fill the resizable window and scroll only the status list. */
export const StatusSettingsWindowStyles = createGlobalStyle`
  .application.dsea-status-settings .window-content {
    display: flex;
    flex-direction: column;
  }

  .application.dsea-status-settings .dsea-status-settings-root {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
`;

export const SettingsForm = styled.form`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 0.5rem;
`;

const rowGrid = css`
  display: grid;
  grid-template-columns: 28px 1fr 72px 190px 56px 56px;
  align-items: center;
  gap: 0.5rem;
`;

export const Header = styled.div`
  ${rowGrid}
  padding: 0 0.25rem;
  font-weight: bold;

  & > :nth-child(3) {
    justify-self: center;
  }
`;

export const StatusList = styled.ul`
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
`;

export const StatusRowItem = styled.li`
  ${rowGrid}
  padding: 0.125rem 0.25rem;

  &:nth-child(odd) {
    background: ${({ theme }) => theme.rowStripe};
  }

  & > input[type="checkbox"] {
    justify-self: center;
  }
`;

export const IconChip = styled.span`
  display: flex;
  width: 26px;
  height: 26px;
  padding: 2px;
  border-radius: 4px;
  background: ${({ theme }) => theme.iconChip};

  img {
    width: 100%;
    height: 100%;
    border: none;
  }
`;

/** Disabled selects get no pointer events, so a locked row's tooltip sits on this wrapper. */
export const DurationCell = styled.span`
  select {
    width: 100%;
  }

  select:disabled {
    opacity: ${({ theme }) => theme.disabledOpacity};
    pointer-events: none;
  }
`;

export const ValueInput = styled.input`
  width: 100%;
  text-align: center;
`;
