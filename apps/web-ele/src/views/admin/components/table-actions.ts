export type TableActionType =
  | 'danger'
  | 'info'
  | 'primary'
  | 'success'
  | 'warning';

export interface TableActionItem {
  key: string;
  label: string;
  type?: TableActionType;
  disabled?: boolean;
  hidden?: boolean;
  loading?: boolean;
  title?: string;
  onClick?: () => Promise<unknown> | unknown;
  children?: TableActionItem[];
}
