import re
import unittest
from pathlib import Path


class MaterialsDefaultTagsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_default_tags_append_folder_names_without_replacing_existing_categories(self):
        required_patterns = [
            r'function\s+buildFolderNameDefaultTags\s*\(',
            r'function\s+mergeTagLists\s*\(',
            r'const\s+folderNameTags\s*=\s*buildFolderNameDefaultTags\(_rawInh\)',
            r'inheritTags\s*=\s*mergeTagLists\(inheritTags,\s*folderNameTags\)',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_saved_tags_still_keep_existing_categories_and_folder_name_defaults(self):
        required_patterns = [
            r'alb\.tags\s*=\s*mergeTagLists\(inheritTags,\s*savedTags\.filter',
            r'else\s+if\(inheritTags\.length\)\s*\{\s*alb\.tags=\[\.\.\.inheritTags\];',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_logic_is_generic_not_limited_to_specific_root_folder(self):
        self.assertNotRegex(self.html, r'function\s+shouldUseFolderNamesAsDefaultTags\s*\(')
        self.assertNotRegex(self.html, r"S\.rootName===['\"]【素材】['\"]")


if __name__ == '__main__':
    unittest.main()
