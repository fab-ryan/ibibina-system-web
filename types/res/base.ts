export interface BaseResponse<T> {
  path: string;
  method: string;
  message: string;
  timestamp: Date;
  success: boolean;
  statusCode: number;
  data?: T;
}

export const extractData = <T>(response: BaseResponse<T>): T | undefined => {
  if (response.success) {
    return response.data;
  }
  return undefined;
};

export interface PaginatedResponse<T> {
  data: { items: T; meta: Meta; links: Links };
  path: string;
  method: string;
  message: string;
  timestamp: Date;
  success: boolean;
  statusCode: number;
}

interface Meta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}
interface Links {
  first: string;
  previous: string;
  next: string;
  last: string;
}
