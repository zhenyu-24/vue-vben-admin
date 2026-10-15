export type SysId = number | string;

/** 分页返回结果包装 */
export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
}
