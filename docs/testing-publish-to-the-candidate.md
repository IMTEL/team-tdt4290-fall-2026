# Testing "Publish to The Candidate" on your own machine

This guide takes you from nothing installed to the test the PRs were checked with:

1. You create an interviewer agent in our web app and click **Publiser**.
2. You start The Candidate in the Unity editor (no VR headset needed), pick your agent, and talk to the interviewer with your microphone.
3. You click **Gjem agent** in the web app, and the agent is gone from The Candidate.

Everything runs on **localhost**. The guide is written for **Windows** and **PowerShell**, and assumes you have never used Unity or Blender.

The PRs being tested:

| Repo          | Branch                         | PR                               |
| ------------- | ------------------------------ | -------------------------------- |
| RAGdoll       | `feat/96-publish-to-candidate` | IMTEL/RAGdoll#162                |
| Our web app   | `feat/96-publish-to-candidate` | IMTEL/team-tdt4290-fall-2026#107 |
| The Candidate | `feat/publish-to-candidate`    | IMTEL/The-Candidate#38           |

**Time:** plan for 2–3 hours the first time. Most of it is downloads: Unity alone is several GB, and the first time Unity opens the project takes 20–60 minutes. Make sure you have about **40 GB** of free disk space.

---

## Before you start: things to get from the team

You can't create those keys yourself. Ask for them first, so you don't get stuck halfway.

| What                                                                                                                                               | Where it goes                 | Ask                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------- |
| `IDUN_API_KEY`: the project's IDUN key. Our web app puts it into every agent it saves. Without a working key the agent can't answer.               | `team-tdt4290-fall-2026/.env` | our team                    |
| `RAGDOLL_CONFIGURATOR_AGENT_ID` and `RAGDOLL_CONFIGURATOR_ACCESS_KEY`: the agent behind **Sett opp en agent**, which you use to create your agent. | `team-tdt4290-fall-2026/.env` | our team                    |
| `RAGDOLL`: The Candidate's own key for its "Coordinator", which decides which NPC talks. It runs on the production server, not on your machine.    | `The-Candidate/.env`          | Mathias (IMTEL) or our team |

Never commit any of these keys, and never paste them into a chat or a PR.

---

## Part 0: Install the tools

Do this once. Restart PowerShell after installing, so it finds the new programs.

### 0.1 Git and Git LFS

1. Install Git from <https://git-scm.com/download/win>. The default choices are fine. Git LFS is included.
2. In PowerShell, run:

   ```powershell
   git lfs install
   ```

   It should print `Git LFS initialized.`. The Candidate stores its 3D models, sounds and textures with Git LFS. Without this step you only get small placeholder files instead of the real ones.

### 0.2 Docker Desktop

1. Install Docker Desktop from <https://www.docker.com/products/docker-desktop/>.
2. Start it. Wait until it says **Engine running** at the bottom left.

### 0.3 Node.js 24 and Python

1. Install **Node.js 24** from <https://nodejs.org/>.
2. Install **Python 3** from <https://www.python.org/downloads/>. You only need it to generate a few secrets. During installation, tick **Add python.exe to PATH**.

### 0.4 Blender (needed even though you never open it)

The room and the furniture in The Candidate are Blender files (`.blend`). Unity can't read them on its own: it starts Blender in the background to convert them. **Without Blender, the conference room is empty**: no walls, no table, no chairs.

1. Download Blender from <https://www.blender.org/download/> (the **Windows Installer**). We tested with Blender 5.2.3.
2. Run the installer and keep the default folder (`C:\Program Files\Blender Foundation\...`). That's where Unity looks.
3. If Windows shows **"Windows protected your PC"**, click **More info → Run anyway**. Windows shows this for many downloaded installers. Only do it if you downloaded the file from blender.org.

Install Blender **before** you open the project in Unity. If you install it later, see [Troubleshooting](#troubleshooting).

### 0.5 Unity Hub

1. Download **Unity Hub** from <https://unity.com/download> and install it.
2. Open it and sign in. A free Unity account with a **Personal** licence is enough.
3. **Don't install an editor yet.** Unity Hub offers the newest version, but the project needs exactly **6000.3.13f1**. You'll install that in Part 4.

---

## Part 1: Start RAGdoll (the backend)

Put all three repos in the same folder, for example `C:\Users\<you>\Projects`:

```text
Projects/
├── RAGdoll/
├── team-tdt4290-fall-2026/
└── The-Candidate/
```

### 1.1 Get the branch

```powershell
cd C:\Users\<you>\Projects
git clone https://github.com/IMTEL/RAGdoll.git
cd RAGdoll
git checkout feat/96-publish-to-candidate
```

If you already have RAGdoll, run `git fetch` and then `git checkout feat/96-publish-to-candidate`.

### 1.2 Create RAGdoll's `.env`

1. Copy the template:

   ```powershell
   copy .env.example .env
   ```

2. Generate three secrets. Run each line and copy what it prints:

   ```powershell
   python -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

   The first line gives `FERNET_KEY`. The second gives `JWT_SECRET`.

3. Open `RAGdoll\.env` in an editor (for example VS Code) and set:

   | Line                    | Set it to                        |
   | ----------------------- | -------------------------------- |
   | `FERNET_KEY=`           | the output of the first command  |
   | `JWT_SECRET=`           | the output of the second command |
   | `CANDIDATE_CLIENT_KEY=` | `local-test-key`                 |
   | `ENV=`                  | leave it as `prod`               |

   `CANDIDATE_CLIENT_KEY` is the shared key The Candidate uses to list and talk to published agents. For testing, `local-test-key` is fine. It must be **exactly** the same as `CANDIDATE=` in The Candidate's `.env` (Part 4).

4. Save the file. Leave everything else as it is.

### 1.3 Start it

```powershell
docker compose -f docker-compose.local.yml up -d --build
```

The first time takes several minutes. Then check that it's up:

```powershell
docker compose -f docker-compose.local.yml ps
curl.exe http://localhost:8000/ping
```

All services should say `healthy` (or `running`), and the ping should answer.

### 1.4 Check the new endpoint

```powershell
curl.exe -H "Authorization: Bearer local-test-key" http://localhost:8000/agents/published
```

It should print `[]`, an empty list, because nothing is published yet. A wrong key should give `Unauthorized`:

```powershell
curl.exe -H "Authorization: Bearer wrong" http://localhost:8000/agents/published
```

> If you get `Empty reply from server`, the backend is still starting. Wait 30 seconds and try again. `docker logs --tail 20 ragdoll-backend` shows `Application startup complete` when it's ready.

---

## Part 2: Start our web app

### 2.1 Get the branch and install

```powershell
cd C:\Users\<you>\Projects
git clone https://github.com/IMTEL/team-tdt4290-fall-2026.git
cd team-tdt4290-fall-2026
git checkout feat/96-publish-to-candidate
npm install
copy .env.example .env
```

### 2.2 Fill in `.env`

Open `team-tdt4290-fall-2026\.env`. The local addresses are already right. Change these lines:

| Line                                                                    | Set it to                                                                    |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `NEXTAUTH_SECRET=`                                                      | the output of `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `IDUN_API_KEY=`                                                         | the key from the team                                                        |
| `RAGDOLL_CONFIGURATOR_AGENT_ID=` and `RAGDOLL_CONFIGURATOR_ACCESS_KEY=` | the values from the team                                                     |

### 2.3 Set up the login (first time only) and start

```powershell
npm run keycloak:setup
npm run dev
```

`keycloak:setup` should print `✓ Keycloak is set up`. If it fails, wait 30 seconds (Keycloak starts slowly) and run it again.

Open <http://localhost:3000>, click **Logg inn**, and log in as **`test@example.com`** / **`test`**.

If logging in fails, see the **Troubleshooting** table in the web app's `README.md`.

---

## Part 3: Create and publish an agent

### 3.1 Create an agent

1. Click **Sett opp en agent** (or go to <http://localhost:3000/configure>).
2. Answer the questions about the job and the job seeker, and save the agent with **Lagre agent**.
3. Go to your agents (<http://localhost:3000/browse-agents>) and open the new agent.

### 3.2 Publish it (#96)

1. On the agent's page, click **Publiser**.
2. A dialog opens:
   - The **name** is filled in with the agent's name. A counter shows `x/80 tegn`. This is the name people see in The Candidate.
   - There is a warning: **"Ikke skriv noe om jobbsøkeren her."** The name and description are the only text The Candidate gets.
3. Write a short description, for example "Intervju for servitør, middels vanskelig", and click **Publiser**.
4. A green chip **"Publisert i The Candidate"** appears, and the button changes to **Gjem agent**.

### 3.3 Check what The Candidate will see

```powershell
curl.exe -H "Authorization: Bearer local-test-key" http://localhost:8000/agents/published
```

You should see your agent with **only** `agent_id`, `name` and `description`. There should be no prompt, no job-seeker answers and no keys.

Also check that editing doesn't unpublish it: click **Rediger**, change something, and save. The chip is still there.

Leave the agent **published** for the next parts.

---

## Part 4: Set up The Candidate

### 4.1 Get the code and the large files

```powershell
cd C:\Users\<you>\Projects
git clone https://github.com/IMTEL/The-Candidate.git
cd The-Candidate
git checkout feat/publish-to-candidate
git lfs pull
```

`git lfs pull` downloads the real 3D models and sounds, and can take a while.

### 4.2 Create The Candidate's `.env`

```powershell
copy .env.example .env
```

Open `The-Candidate\.env` and set:

```text
IDUN=
RAGDOLL=<the key from Mathias or the team>
CANDIDATE=local-test-key
```

- `CANDIDATE` must be exactly the same as `CANDIDATE_CLIENT_KEY` in RAGdoll's `.env`.
- Without a working `RAGDOLL` key, your agent still shows up in the list, but **nobody in the room will talk**.

### 4.3 Start Unity Hub so Unity can see the keys

Unity reads the keys from environment variables. These are only set if Unity Hub is started from PowerShell like this.

1. **Quit Unity Hub completely.** Closing the window isn't enough, because it keeps running in the background. Find the Unity Hub icon in the system tray (the small icons by the clock, possibly behind the **^** arrow), right-click it, and choose **Quit**.
2. In PowerShell, run:

   ```powershell
   cd C:\Users\<you>\Projects\The-Candidate
   Get-Content .env | ForEach-Object { if ($_ -match '^\s*([^#=]+)=(.*)$') { Set-Item "Env:$($matches[1].Trim())" $matches[2].Trim() } }
   & "C:\Program Files\Unity Hub\Unity Hub.exe"
   ```

   This does the same as the project's `Start.ps1`. `Start.ps1` only works if `unityhub` is on your PATH, which it usually isn't on Windows.

**Do this every time you start Unity for this test.** If Unity was started any other way (from the Start menu, a desktop icon, or a Unity Hub that was already running), it won't have the keys.

### 4.4 Install the right Unity version and open the project

1. In Unity Hub, click **Projects** on the left, then **Add → Add project from disk**.
2. Select the **`The-Candidate`** folder itself (the one that contains `Assets` and `ProjectSettings`), and click **Select Folder**. If Unity says "Select a folder that contains a Unity project", you picked a folder one level too high or too low.
3. The project now appears in the list with a warning that editor **6000.3.13f1** is missing. Click the warning or the version number, and choose to **install 6000.3.13f1**.
   - When it asks about modules, you don't need any extra ones for this test. Just continue.
   - Make sure it says **6000.3.13f1**, not 6000.6 or another "recommended" version.
4. When the editor is installed, click **The-Candidate** in the project list to open it.
5. **The first open takes 20–60 minutes.** Unity imports every asset, and Blender converts the room models. Let it finish. When the editor window is fully open with no progress bar, it's done.

### 4.5 Learn the three windows you'll use

- **Project** (bottom): the files, like a file explorer. `Assets` is the top folder.
- **Inspector** (right): the settings of whatever you clicked.
- **Console** (a tab next to **Project** at the bottom): messages and errors. If you can't see it, open **Window → General → Console**.

### 4.6 Check that the room is there

1. In the **Project** window, go to **Assets → Scenes**.
2. Double-click **ConferanceRoom** (the file with the Unity logo, not a folder).
3. In the **Scene** tab you should see a meeting room with walls and furniture.

If the room is empty or only a few objects float in empty space, Unity didn't find Blender. See [Troubleshooting](#troubleshooting).

---

## Part 5: Test-only settings in Unity

These three settings let Unity talk to your local RAGdoll and let you play without a headset. They are **for testing only and must never be committed**. Part 8 shows how to undo them.

### 5.1 Allow plain http (localhost)

Unity blocks `http://` by default, and your local RAGdoll has no `https`.

1. Click **Edit → Project Settings…**
2. Click **Player** in the list on the left.
3. On the right, click **Other Settings** to open it, and scroll down to **Allow downloads over HTTP***.
4. Set it to **Always allowed**.
5. Close the window.

### 5.2 Point The Candidate at your local RAGdoll

1. In the **Project** window, go to **Assets → Scripts → Providers**.
2. Click **PublishedRag** once. Click the asset, not `PublishedRagProvider.cs`.
3. In the **Inspector**, replace **Url** with `http://localhost:8000` and press **Enter**.
4. Leave **Api Key** as `CANDIDATE`. That's the _name_ of the line in `.env`, not the key itself.

### 5.3 Add the keyboard-and-mouse simulator

The Candidate is a VR app. The simulator lets you play it with your keyboard and mouse.

1. Click **Window → Package Manager**.
2. On the left, find and click **XR Interaction Toolkit**.
3. On the right, open the **Samples** tab. Find **XR Interaction Simulator** and click **Import**.
4. Click **Edit → Project Settings…**, then **XR Plug-in Management → XR Interaction Toolkit** on the left.
5. Tick **Use XR Interaction Simulator in scenes**.
6. Close the window.

**Simulator controls:**

| Do this                                            | Key                                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Look around                                        | Hold the **right mouse button** and move the mouse                                                  |
| Move                                               | **W A S D**, **Q/E** for down/up                                                                    |
| Control the head, or one of the hands              | **H** = head, **]** = right hand, **[** = left hand (Norwegian keyboard: **AltGr+9** / **AltGr+8**) |
| Press the "trigger" (click with the VR controller) | **T**                                                                                               |

Often you can also just click buttons in the **Game** view with the mouse.

---

## Part 6: Run the test

### 6.1 Start the game

1. In the **Project** window, go to **Assets → Scenes** and double-click **Start**. Use the scene file with the Unity logo, not a folder. If you press Play in an "Untitled" scene, nothing happens.
2. Click the **Console** tab, then **Clear**.
3. Press **Play** (▶ at the top middle). The button turns blue while the game runs.
4. Click inside the **Game** view so it gets your keyboard and mouse.

### 6.2 Pick your published agent

1. In front of you is the menu. A list of interviewers shows **"Standard intervjuer"**, followed by the name you published in Part 3.
2. Click your agent.
3. The conference room loads with **one** interviewer (NPC).
4. **Wait about 10 seconds.** The interviewer introduces themselves on their own, and you hear them speak.

### 6.3 Talk to the interviewer

1. Click the **microphone icon** in the Game view to start recording.
2. Say something in Norwegian, for example "Hei, jeg heter Kari, og jeg søker på stillingen."
3. Click the microphone icon again to stop. An icon spins while the answer is being made.
4. After 5–15 seconds, the interviewer answers out loud, as the interviewer you configured in the web app.

In the Console you can see what you said, as `Final text: ...`.

### 6.4 Hide the agent (#97)

1. Press **Play** (▶) again to stop the game.
2. In the web app, open the agent and click **Gjem agent**, then confirm. The green chip disappears.
3. Check the list:

   ```powershell
   curl.exe -H "Authorization: Bearer local-test-key" http://localhost:8000/agents/published
   ```

   It prints `[]`.

4. In Unity, press **Play** again. The list now only shows **"Standard intervjuer"**.

**If all of this worked, the feature works.** 🎉

---

## Part 7: What you can ignore in the Console

These messages show up in a normal run and are not caused by this feature:

- `Rig Error: Avatar creation failed` / `Copied Avatar Rig Configuration mis-match`: a character model's bone setup.
- `Importer(FBXImporter) generated inconsistent result for asset ... .blend`: Blender output differs slightly between imports.
- `XR_ERROR_RUNTIME_UNAVAILABLE`, `Failed to initialize subsystem OpenXR Display`: no VR headset is connected.
- `The referenced script (Unknown) on this Behaviour is missing!`
- `There can be only one active Event System.`

---

## Part 8: Clean up before you commit anything

The settings from Part 5 must not end up in a commit. In particular, "Allow downloads over HTTP" would weaken the security of the real app.

1. In Unity: **Edit → Project Settings → Player → Other Settings**, and set **Allow downloads over HTTP** back to **Not allowed**.
2. Click **PublishedRag** and set **Url** back to `https://iplvr.it.ntnu.no/backend`.
3. **File → Save Project**, then close Unity (**File → Exit**).
4. In PowerShell:

   ```powershell
   cd C:\Users\<you>\Projects\The-Candidate
   git status
   ```

   Undo the files Unity changed by itself during testing:

   ```powershell
   git checkout -- ProjectSettings Assets/XRI Assets/XR The-Candidate.slnx Assets/Scripts/Providers/PublishedRag.asset
   ```

5. Don't commit the `Assets/Samples/XR Interaction Toolkit/...` folder (the simulator). You can keep it locally for the next test. Always add files by name, never with `git add .`.

If you only reviewed and didn't change anything, `git status` should now show nothing except that `Samples` folder.

---

## Troubleshooting

| What you see                                                                       | Why, and what to do                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The conference room is empty, or the Console says **"Blender could not be found"** | Blender wasn't installed when Unity imported the models. Install Blender (Part 0.4), restart Unity (Part 4.3), then in the **Project** window right-click **Assets → Models → Reimport** and wait.                                                                                                                                                                                                       |
| Unity Hub only offers another version (for example 6000.6)                         | Go to <https://unity.com/releases/editor/archive>, find **6000.3.13f1**, and click **Unity Hub** next to it. Unity Hub then installs that exact version.                                                                                                                                                                                                                                                 |
| The list only shows **"Standard intervjuer"**, but the agent is published          | Look for `Could not fetch the published agents` in the Console. Usually: (1) Unity wasn't started with the keys (Part 4.3; quit Unity Hub from the tray first); (2) `CANDIDATE` doesn't match `CANDIDATE_CLIENT_KEY`; (3) **Url** isn't `http://localhost:8000` (Part 5.2); (4) HTTP isn't allowed (Part 5.1, the Console says `Insecure connection not allowed`); (5) RAGdoll isn't running (Part 1.3). |
| The microphone icon spins forever and nobody answers                               | Look in the Console for a red `Error:` line. `401 Unauthorized`: the `RAGDOLL` key for the production Coordinator is wrong or expired; ask Mathias. `403 Forbidden`: the agent was hidden. No error at all: check that you're on the branch `feat/publish-to-candidate`, which contains the fix for a Coordinator bug on The Candidate's `main`.                                                         |
| The interviewer answers with an IDUN or "Authentication" error                     | The agent's IDUN key doesn't work. Check `IDUN_API_KEY` in the web app's `.env`, restart `npm run dev`, and create a new agent (or clone the old one) so it gets the new key.                                                                                                                                                                                                                            |
| Moving the mouse doesn't turn the view                                             | Hold the **right mouse button** while you move the mouse, and click inside the Game view first.                                                                                                                                                                                                                                                                                                          |
| `Empty reply from server` from `curl.exe`                                          | RAGdoll is still starting. Wait 30 seconds.                                                                                                                                                                                                                                                                                                                                                              |
| Changes to code or `.env` in RAGdoll don't take effect                             | Restart the backend: `docker compose -f docker-compose.local.yml up -d --force-recreate backend` (in the RAGdoll folder).                                                                                                                                                                                                                                                                                |
| You pressed Play and only see an empty "Untitled" scene                            | You opened a folder, not the scene. Double-click the **Start** scene file in **Assets → Scenes**.                                                                                                                                                                                                                                                                                                        |
