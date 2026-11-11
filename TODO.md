# TODO

- Label customizations for DeltaViewer and UpdateDeltaRowLabel components
  - Injected via plugin config 
- Color customizations for DeltaViewer
  - Injected via plugin config 
- Better support for lexical-editor changes in DeltaViewer
  - Right now it is treated as-is (so kind of like JSON), but it would be nice to have a more structured diff view for it
- Better support for media collection changes in DeltaViewer
  - For example, recognize by the collection fields that that collection holds media, then give a single media diff preview instead of a diff for each property that changes
- Multiple `userCollection` support
  - Right now, the plugin assumes that there is only one user collection, but it would be nice to support multiple user collections (for example, if you have a separate collection for admins and regular users)