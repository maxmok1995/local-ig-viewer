import re
import unittest
from pathlib import Path


class FolderTagToggleStyleTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_state_tracks_active_folder_parent_for_inline_child_buttons(self):
        required_patterns = [
            r'activeFolderCategoryParent\s*:\s*null',
            r'function\s+buildFolderCategoryToggleBar\s*\(',
            r'function\s+getFolderCategoryGroupsForToggle\s*\(',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_folder_toggle_bar_uses_segmented_parent_button_and_inline_extra_children(self):
        required_patterns = [
            r'bar\.className\s*=\s*["\']homePreviewBar folderCategoryToggleBar["\']',
            r'btn\.className\s*=\s*["\']homePreviewBtn folderCategoryParentBtn["\']\s*\+\s*\(isActive\s*\?\s*["\'] active["\']\s*:\s*["\']["\']\)',
            r'childBtn\.className\s*=\s*["\']homePreviewExtraBtn folderCategoryChildBtn["\']\s*\+\s*\(childActive\s*\?\s*["\'] active["\']\s*:\s*["\']["\']\)',
            r'if\(isActive&&group\.children\.length\)\s*\{',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_folder_toggle_bar_is_inserted_above_filter_section_in_home_view(self):
        required_patterns = [
            r'const\s+folderToggleBar\s*=\s*buildFolderCategoryToggleBar\(\)',
            r'if\(folderToggleBar\)\s*stickyTop\.appendChild\(folderToggleBar\)',
            r'const\s+oldBar\s*=\s*\$\(["\']folderCategoryToggleBar["\']\)',
            r'if\(oldBar\)\s*oldBar\.replaceWith\(buildFolderCategoryToggleBar\(\)\)',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
