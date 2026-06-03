import { prisma } from './db'

export type ActivityAction =
  | 'UPLOAD_REPORT'
  | 'CREATE_FOLDER'
  | 'CREATE_SUBFOLDER'
  | 'SHARE_FOLDER'
  | 'DELETE_REPORT'
  | 'DELETE_FOLDER'
  | 'EDIT_REPORT'

export function recordActivity(params: {
  userId: string
  userName: string
  action: ActivityAction
  targetId?: string
  targetName?: string
  folderId?: string
  folderName?: string
}) {
  // fire-and-forget — never blocks the response
  prisma.activity.create({ data: params }).catch(() => {})
}

export const ACTION_LABELS: Record<ActivityAction, string> = {
  UPLOAD_REPORT:    'uploaded',
  CREATE_FOLDER:    'created folder',
  CREATE_SUBFOLDER: 'created subfolder',
  SHARE_FOLDER:     'shared folder',
  DELETE_REPORT:    'deleted report',
  DELETE_FOLDER:    'deleted folder',
  EDIT_REPORT:      'edited',
}
