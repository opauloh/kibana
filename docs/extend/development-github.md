---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/development-github.html
---

# How we use Git and GitHub [development-github]


## Forking [_forking]

We follow the [GitHub forking model](https://help.github.com/articles/fork-a-repo/) for collaborating on {{kib}} code. This model assumes that you have a remote called `upstream` which points to the official {{kib}} repo, which we’ll refer to in later code snippets.


## Branching [_branching]

At Elastic, all products in the stack, including Kibana, are released at the same time with the same version number. Most of these projects have the following branching strategy:

* `main` points to the next minor version.
* `<major>.<minor>` is the previously released minor version, including patch releases.

As an example, let’s assume that the main branch is currently a not-yet-released 8.1.0. Once 8.1.0 has reached feature freeze, it will be branched to 8.1 and main will be updated to reflect 8.2.0. The release of 8.1.0 and subsequent patch releases will be cut from the 8.1 branch. At any time, you can verify the current version of a branch by inspecting the version attribute in the package.json file within the Kibana source.

Pull requests are made into the `main` branch and then backported when it is safe and appropriate.

* Breaking changes can *only* be made to `main` if there has been at least an 18 month deprecation period *and* the breaking change has been approved. Telemetry showing current usage is crucial for gaining approval.
* Features should not be backported to a `<major>.<minor>` branch.
* Bug fixes can be backported to a `<major>.<minor>` branch if the changes are safe and appropriate. Safety is a judgment call you make based on factors like the bug’s severity, test coverage, confidence in the changes, etc. Your reasoning should be included in the pull request description.
* Documentation changes can be backported to any branch at any time.


## Commits and Merging [_commits_and_merging]

* Feel free to make as many commits as you want, while working on a branch.
* When submitting a PR for review, please perform an interactive rebase to present a logical history that’s easy for the reviewers to follow.
* Please use your commit messages to include helpful information on your changes, e.g. changes to APIs, UX changes, bugs fixed, and an explanation of *why* you made the changes that you did.
* Resolve merge conflicts by rebasing the target branch over your feature branch, and force-pushing (see below for instructions).
* When merging, we’ll squash your commits into a single commit.


### Commit using your `@elastic.co` email address [_commit_using_your_elastic_co_email_address]

In order to assist with developer tooling we ask that all Elastic engineers use their `@elastic.co` email address when committing to the Kibana repo. We have implemented a CI check that validates any PR opened by a member of the `@elastic` organization has at least one commit that is attributed to an `@elastic.co` email address. If you have a PR that is failing because of this check you can fix your PR by following these steps:

1. Ensure that you don’t have any staged changes
2. Checkout the branch for your PR
3. Update the git config for your current repository to commit with your `@elastic.co` email:

    ```shell
    git config user.email YOUR_ELASTIC_EMAIL@elastic.co
    ```

4. Create a commit using the new email address

    ```shell
    git commit -m 'commit using @elastic.co' --allow-empty
    ```

5. Push the new commit to your PR and the status should now be green


### Rebasing and fixing merge conflicts [_rebasing_and_fixing_merge_conflicts]

Rebasing can be tricky, and fixing merge conflicts can be even trickier because it involves force pushing. This is all compounded by the fact that attempting to push a rebased branch remotely will be rejected by git, and you’ll be prompted to do a `pull`, which is not at all what you should do (this will really mess up your branch’s history).

Here’s how you should rebase master onto your branch, and how to fix merge conflicts when they arise.

First, make sure master is up-to-date.

```shell
git checkout master
git fetch upstream
git rebase upstream/master
```

Then, check out your branch and rebase master on top of it, which will apply all of the new commits on master to your branch, and then apply all of your branch’s new commits after that.

```shell
git checkout name-of-your-branch
git rebase master
```

You want to make sure there are no merge conflicts. If there are merge conflicts, git will pause the rebase and allow you to fix the conflicts before continuing.

You can use `git status` to see which files contain conflicts. They’ll be the ones that aren’t staged for commit. Open those files, and look for where git has marked the conflicts. Resolve the conflicts so that the changes you want to make to the code have been incorporated in a way that doesn’t destroy work that’s been done in master. Refer to master’s commit history on GitHub if you need to gain a better understanding of how code is conflicting and how best to resolve it.

Once you’ve resolved all of the merge conflicts, use `git add -A` to stage them to be committed, and then use `git rebase --continue` to tell git to continue the rebase.

When the rebase has completed, you will need to force push your branch because the history is now completely different than what’s on the remote. This is potentially dangerous because it will completely overwrite what you have on the remote, so you need to be sure that you haven’t lost any work when resolving merge conflicts. (If there weren’t any merge conflicts, then you can force push without having to worry about this.)

```shell
git push origin name-of-your-branch --force
```

This will overwrite the remote branch with what you have locally. You’re done!

**Note that you should not run git pull**, for example in response to a push rejection like this:

```shell
! [rejected] name-of-your-branch -> name-of-your-branch (non-fast-forward)
error: failed to push some refs to 'https://github.com/YourGitHubHandle/kibana.git'
hint: Updates were rejected because the tip of your current branch is behind
hint: its remote counterpart. Integrate the remote changes (e.g.
hint: 'git pull ...') before pushing again.
hint: See the 'Note about fast-forwards' in 'git push --help' for details.
```

Assuming you’ve successfully rebased and you’re happy with the code, you should force push instead.


## Creating a pull request [_creating_a_pull_request]

See [Submitting a pull request](/extend/development-pull-request.md) for the next steps on getting your code changes merged into {{kib}}.
