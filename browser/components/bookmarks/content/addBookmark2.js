# -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
# ***** BEGIN LICENSE BLOCK *****
# Version: NPL 1.1/GPL 2.0/LGPL 2.1
# 
# The contents of this file are subject to the Netscape Public License
# Version 1.1 (the "License"); you may not use this file except in
# compliance with the License. You may obtain a copy of the License at
# http://www.mozilla.org/NPL/
# 
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
# 
# The Original Code is mozilla.org code.
# 
# The Initial Developer of the Original Code is 
# Netscape Communications Corporation.
# Portions created by the Initial Developer are Copyright (C) 1998
# the Initial Developer. All Rights Reserved.
# 
# Contributor(s):
#   Ben Goodger <ben@netscape.com> (Original Author)
#   David Hyatt <hyatt@mozilla.org>
# 
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or 
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the NPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the NPL, the GPL or the LGPL.
# 
# ***** END LICENSE BLOCK ***** */

/**
 * Add Bookmark Dialog. 
 * ====================
 * 
 * This is a generic bookmark dialog that allows for bookmark addition
 * and folder selection. It can be opened with various parameters that 
 * result in appearance/purpose differences and initial state. 
 * 
 * Use: Open with 'openDialog', with the flags 
 *        'centerscreen,chrome,dialog=no,resizable=yes'
 * 
 * Parameters: 
 *   Apart from the standard openDialog parameters, this dialog can 
 *   be passed additional information, which gets mapped to the 
 *   window.arguments array:
 * 
 *   window.arguments[0]: Bookmark Name. The value to be prefilled
 *                        into the "Name: " field (if visible).
 *   window.arguments[1]: Bookmark URL: The location of the bookmark.
 *                        The value to be filled in the "Location: "
 *                        field (if visible).
 *   window.arguments[2]: Bookmark Folder. The RDF Resource URI of the
 *                        folder that this bookmark should be created in.
 *   window.arguments[3]: Bookmark Charset. The charset that should be
 *                        used when adding a bookmark to the specified
 *                        URL. (Usually the charset of the current 
 *                        document when launching this window). 
 *   window.arguments[4]: The mode of operation. See notes for details.
 *   window.arguments[5]: If the mode is "addGroup", this is an array
 *                        of objects with name, URL and charset
 *                        properties, one for each group member.
 *   window.arguments[6]: If the bookmark should become a web panel.
 */

var gSelectedFolder;
var gName;
var gMenulist;
var gBookmarkTree;
var gGroup;

function Startup()
{
  sizeToContent(); //XXXpch buggy imo, we shouldn't need it
  initServices();
  initBMService();
  gName  = document.getElementById("name");
  gGroup = document.getElementById("addgroup");
  gMenulist = document.getElementById("select-menu");
  gBookmarkTree = document.getElementById("folder-tree");
  gName.value = window.arguments[0];
  gName.select();
  gName.focus();
  onFieldInput();
} 

function onFieldInput()
{
  const ok = document.documentElement.getButton("accept");
  ok.disabled = gName.value == "";
}    

function onOK()
{
  RDFC.Init(BMDS, gSelectedFolder);

  var url, rSource;
  if (gGroup && gGroup.checked) {
    rSource = BMDS.createFolder(gName.value);
    const groups = window.arguments[5];
    for (var i = 0; i < groups.length; ++i) {
      url = getNormalizedURL(groups[i].url);
      BMDS.createBookmarkInContainer(groups[i].name, url, null, null,
                                     groups[i].charset, rSource, -1);
    }
  } else {
    url = getNormalizedURL(window.arguments[1]);
    rSource = BMDS.createBookmark(gName.value, url, null, null, window.arguments[3]);
  }

  var selection = BookmarksUtils.getSelectionFromResource(rSource);
  var target    = BookmarksUtils.getTargetFromFolder(gSelectedFolder);
  BookmarksUtils.insertAndCheckSelection("newbookmark", selection, target);
  
  if (window.arguments[6] && rSource) {
        // Assert that we're a web panel.
        BMDS.Assert(rSource, RDF.GetResource(NC_NS+"WebPanel"),
                    RDF.GetLiteral("true"), true);
  }
  
  // in insertSelection, the ds flush is delayed. It will never be performed,
  // since this dialog is destroyed before.
  // We have to flush manually
  var remoteDS = BMDS.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
  remoteDS.Flush();
}

function getNormalizedURL(url)
{
  // Check to see if the item is a local directory path, and if so, convert
  // to a file URL so that aggregation with rdf:files works
  try {
    const kLF = Components.classes["@mozilla.org/file/local;1"]
                          .createInstance(Components.interfaces.nsILocalFile);
    kLF.initWithPath(url);
    if (kLF.exists()) {
      var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                                .getService(Components.interfaces.nsIIOService);
      var fileHandler = ioService.getProtocolHandler("file")
                                 .QueryInterface(Components.interfaces.nsIFileProtocolHandler);

      url = fileHandler.getURLSpecFromFile(kLF);
    }
  }
  catch (e) {
  }

  return url;
}

function selectMenulistFolder(aEvent)
{
  gSelectedFolder = RDF.GetResource(aEvent.target.id);
}

function selectTreeFolder()
{
  gSelectedFolder = gBookmarkTree._selection.item[0];
  gMenulist.label = BookmarksUtils.getProperty(gSelectedFolder, NC_NS+"Name");
}

function expandTree()
{
  setFolderTreeHeight();
  var isCollapsed = gBookmarkTree.collapsed;
  document.getElementById("expander").setAttribute("class", isCollapsed? "up":"down");
  gBookmarkTree.collapsed = !isCollapsed;
  sizeToContent();
}

function setFolderTreeHeight()
{
  var isCollapsed = gBookmarkTree.collapsed;
  if (!isCollapsed)
    gBookmarkTree.setAttribute("height", gBookmarkTree.boxObject.height);
}
