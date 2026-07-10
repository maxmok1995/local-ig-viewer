import re
import unittest
from pathlib import Path


class FolderGroupedTagsUiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_folder_default_categories_support_parent_child_groups_from_hyphenated_names(self):
        required_patterns = [
            r'const\s+preferredFolderCategoryOrder\s*=\s*\[\s*["\']人["\']\s*,\s*["\']工作["\']\s*,\s*["\']吃喝["\']\s*,\s*["\']行["\']\s*,\s*["\']住["\']\s*,\s*["\']玩乐["\']\s*\]',
            r'function\s+parseFolderCategoryName\s*\(',
            r'const\s+dash\s*=\s*raw\.indexOf\(["\']-["\']\)',
            r'children\.push\(\{\s*l2:\{zh:info\.(child|raw),en:info\.(child|raw),th:info\.(child|raw),ja:info\.(child|raw),ko:info\.(child|raw)\}',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_single_grouped_folder_tag_maps_to_parent_and_expandable_child_tag(self):
        required_patterns = [
            r'const\s+folderChild\s*=\s*group\?\.children\?\.find\(c=>c\.kw&&c\.kw\.some\(kw=>fn1===kw\.toLowerCase\(\)\)\)',
            r'if\(_rawInh\.length===1\)\s*\{\s*inheritTags\s*=\s*folderChild\s*\?\s*\[l1Tag,\s*`\$\{l1Tag\}/\$\{tagName\(folderChild\.l2\)\}`\]\s*:\s*\[l1Tag\]',
            r'inheritTags\s*=\s*mergeTagLists\(inheritTags,\s*folderNameTags\)',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
