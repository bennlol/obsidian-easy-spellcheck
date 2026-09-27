import manifest from "../manifest.json";
import packageJson from "../package.json";
import versions from "../versions.json";

const tag = process.argv[2];
if (!tag) throw new Error("Pass the release tag, for example 0.1.0");
if (tag !== manifest.version) throw new Error(`Tag ${tag} does not match manifest version ${manifest.version}`);
const version = tag;
if (version !== packageJson.version) throw new Error(`package.json version ${packageJson.version} does not match ${version}`);
if (!(version in versions)) throw new Error(`versions.json has no entry for ${version}`);
if (versions[version as keyof typeof versions] !== manifest.minAppVersion) {
  throw new Error(`versions.json and manifest.json disagree on the minimum Obsidian version for ${version}`);
}
console.debug(`Release versions agree on ${version}`);
