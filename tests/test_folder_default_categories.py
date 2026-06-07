import re
import unittest
from pathlib import Path


class FolderDefaultCategoriesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_state_collects_root_folder_names_as_builtin_default_categories(self):
        required_patterns = [
            r'defaultFolderCategories\s*:\s*\[\]',
            r'function\s+buildFolderDefaultCategoryGroups\s*\(',
            r'S\.defaultFolderCategories\s*=\s*\[\.\.\.new Set\(detectedCategories\)\].*',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_effective_hierarchy_and_tag_manager_include_builtin_folder_categories(self):
        required_patterns = [
            r'const\s+base=\[\.\.\.TAG_HIERARCHY,\s*\.\.\.buildFolderDefaultCategoryGroups\(\)\]',
            r'const\s+builtinGroups=\[\.\.\.TAG_HIERARCHY,\s*\.\.\.buildFolderDefaultCategoryGroups\(\)\]',
            r'_systemDefault:\s*true',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_builtin_folder_categories_are_rendered_as_default_and_not_deletable(self):
        required_patterns = [
            r'builtinGroups\.forEach\(group=>\{',
            r'if\(group\._systemDefault\)\s*\{\s*const\s+badge=_mk\(["\']span["\'],\s*["\']tmCustomBadge["\'],\s*["\']資料夾["\']\)',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
