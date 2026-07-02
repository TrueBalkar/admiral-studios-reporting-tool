// Pure display labels for activity feed items — the actual activity
// recording logic now lives in the FastAPI backend (app/services/activity.py).
export const ACTION_LABELS: Record<string, string> = {
  UPLOAD_REPORT: 'uploaded',
  CREATE_FOLDER: 'created folder',
  CREATE_SUBFOLDER: 'created subfolder',
  SHARE_FOLDER: 'shared folder',
  DELETE_REPORT: 'deleted report',
  DELETE_FOLDER: 'deleted folder',
  EDIT_REPORT: 'edited',
}
