type UserDescriptionLabels = {
  collectionSlugPrefix: string
  userIdPrefix: string
}

const defaultUserDescriptionLabels: UserDescriptionLabels = {
  /**
   * The prefix for the collection slug in the user description.
   * For example, if the collection slug is "users", this could be "Collection:".
   * Note: the value is trimmed and a space is added after it
   */
  collectionSlugPrefix: 'Collection:',
  /**
   * The prefix for the user id in the user description.
   * For example, if the user id is "123", this could be "User id:".
   * Note: the value is trimmed and a space is added after it
   */
  userIdPrefix: 'User id:',
}

export type { UserDescriptionLabels }
export { defaultUserDescriptionLabels }
