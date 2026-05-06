import re
import unittest
from pathlib import Path


class FolderTagAutoMoveTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_folder_tag_helpers_exist(self):
        required_patterns = [
            r'function\s+isStandardSecondLevelFolderTag\s*\(',
            r'function\s+getPrimaryFolderCategoryTag\s*\(',
            r'async\s+function\s+moveAlbumFolderToCategory\s*\(',
            r'async\s+function\s+setPrimaryFolderCategoryTag\s*\(',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_primary_folder_tag_is_single_select_and_removes_other_folder_tags(self):
        required_patterns = [
            r'const\s+existingPrimary\s*=\s*getPrimaryFolderCategoryTag\(alb\)',
            r'\(alb\.tags\|\|\[\]\)\.filter\(t=>!isStandardSecondLevelFolderTag\(t\)\)',
            r'nextTags\.push\(folderTag\)',
            r'if\(existingPrimary===folderTag\)\s*return\s+false',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_setting_folder_tag_moves_whole_album_folder_from_uncategorized(self):
        required_patterns = [
            r'if\(currentCategory===folderTag\)\s*return\s+false',
            r'const\s+srcRel\s*=\s*alb\._folderRelPath\s*\|\|\s*alb\.name',
            r'const\s+destDir\s*=\s*await\s+S\.rootDirHandle\.getDirectoryHandle\(folderTag,\s*\{create:true\}\)',
            r'await\s+copyDirectoryRecursive\(srcDir,\s*newDir,\s*\{skipExisting:true\}\)',
            r'await\s+srcParent\.removeEntry\(srcName,\s*\{recursive:true\}\)',
            r"alb\._folderRelPath\s*=\s*`\$\{folderTag\}/\$\{destName\}`",
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_tag_editor_distinguishes_folder_tags_from_regular_tags(self):
        required_patterns = [
            r"chip\.className='tagChip'\+\(isStandardSecondLevelFolderTag\(tag\)\s*\?\s*' folderTagChip'\s*:\s*' normalTagChip'\)",
            r'c\.addEventListener\(["\']click["\'],\s*async\s*\(\)\s*=>\s*\{\s*if\(isStandardSecondLevelFolderTag\(tag\)\)',
            r'addBtn\.addEventListener\(["\']click["\'],\s*\(\)\s*=>\s*void\s+doAdd\(\)\)',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
