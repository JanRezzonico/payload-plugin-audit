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
- Update readme with actual npm package name and instructions before publishing to npm
- Virtual fields are populated and sent out when a request is made even via the rest API or local API, not just when the Admin UI is used. I do not know if this could be an issue, but it would be fixed by making the fields "ui" instead of "virtual", but that would require a partial rewrite of the fields and components to support that. For now, I will leave it as is, since access control is still respected and the fields are not sent out to the client unless the user has access to them.