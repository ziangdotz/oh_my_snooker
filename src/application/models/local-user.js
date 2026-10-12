// Explicit live dependencies preserve initialization and shared state.
export default function createLocalUser(dependencies) {
  return class LocalUser {
    constructor(t) {
      ((this.userInfo = dependencies.gameRecords.a.makeUserInfo(
        t.userId,
        t.displayName,
        t.level,
        t.stickName,
      )),
        (this.money = t.money || 0));
    }
  };
}
