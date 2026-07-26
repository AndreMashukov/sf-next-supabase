import { buildDocumentStoragePath, buildStorageObjectKey } from '../index';

describe('Storage helpers', () => {
  it('builds a user-scoped storage path', () => {
    expect(buildDocumentStoragePath('user-1', 'doc-1')).toBe(
      'users/user-1/documents/doc-1/content.html',
    );
  });

  it('builds a bucket-qualified object key', () => {
    expect(buildStorageObjectKey('documents', 'users/u/doc/content.html')).toBe(
      'documents/users/u/doc/content.html',
    );
  });
});
