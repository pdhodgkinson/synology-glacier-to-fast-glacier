synology-glacier-to-fast-glacier
================================

Download your Synology Glacier archives in Fast Glacier.

* The Synology DiskStation Glacier app only allows you to download an *ENTIRE* Glaicer vault if you 
want to do recover files. That's lame!
* [FastGlacier] (http://fastglacier.com/) is a Windows application that allows you to download 
individual files from FastGlacier.
* This program converts the data that is stored in the DiskStation into a format that FastGlacier
 can read, thus allowing you to download individual files that were stored by the DiskStation 
 Glacier app.
 
Requirements
------------
1. [Node] (nodejs.org)
2. Run `npm install` to install dependencies

Initial Steps
--------------
1. Do an inventory request via FastGlacier to retrieve the vault archive listing
    * FastGlacier stores the archive listing under  
    `/Users/<user>/AppData/Roaming/FastGlacier/cache`
    * Find the cache sub-directory and file which matches the vault in question. The names of these 
    folder and files aren't human readable, so if you have more than one you can identify the 
    correct file by opening the files in a text editor and looking at the VaultARN at the 
    beginning of the file.
2. Synology Glacier Sqlite DB
    * **If you have shell access to the DiskStation**: The DB is typically found in the 
    `/var/packages/GlacierBackup/target/etc` 
    directory with a filename like `<diskstation_glacier_backup_task_name>.mapping.db`. Copy
    this file somewhere else for backup. This program does not modify the contents of the DB, but
    it is safer to operate on a copy of the DB rather than the original.
    * **Or** Do a Download request in FastGlacier for the single file within the 
    Diskstation_mapping vault. This is the same sqlite DB as is stored on the DiskStation.


Command-Line Usage
------------------
`node run.js --db <path_to_sqlite_db> --vault <path_to_fast_glacier_vault_cache> [--out 
<file_to_write_modified_vault_output>]`

* By default this library will write to a file with name <path_to_fast_glacier_vault_cache>.new,
  but always backup your original files, to be safe and save time if something goes wrong.
* Overwrite and replace the original FastGlacier cache file (after backing it up!) with the newly 
generated file. You should now be able to see all the correct filenames in FastGlacier after a 
restart.

Todo
----
* add command line options parsing
* Tests
* Use https://github.com/rogerwang/node-webkit to build executable
