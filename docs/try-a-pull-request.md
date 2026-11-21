# Try a pull request on your own computer

To see what a pull request does before it's merged, run its demos locally. You need a copy of the repository and
Node 22, once.

## Each time

1. **Switch to the pull request.** In GitHub Desktop, open the **Current Branch** menu, choose the **Pull Requests**
   tab, and pick the pull request. (In a terminal: `git fetch` then `git switch <branch name>`.)
2. **Start the demos.** In GitHub Desktop, choose **Repository → Open in Terminal**, then run:

   ```sh
   npm run demo
   ```

   Your browser opens `http://localhost:4321/demo/`. Only your computer can reach it.
3. **Try it.** Every demo on the page is that pull request's version. Reload the browser after switching branches.
4. **Stop** with Ctrl+C in the terminal when you're done.

## Notes

- The demo in Sveltia CMS keeps your changes in this browser for `localhost:4321`. Start fresh with Sveltia's
  Settings → Data Management → Erase All Data.
- If port 4321 is busy: `npm run demo -- 4322`.
- Back to the current version: switch to `main` in GitHub Desktop and pull.
