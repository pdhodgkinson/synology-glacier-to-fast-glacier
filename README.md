synology-glacier-to-fast-glacier
================================

Download your Synology Glacier archives in Fast Glacier.

Steps
-----
1. Get sqlite db from Diskstation
    * typically found in the /var/packages/GlacierBackup/target/etc directory with name task_name.mapping.db
    * Or grab from Glacier will have name like Diskstation_mapping
2. Do a inventory request via Glacier to get a cache file
    * Stores in /Users/<user>/AppData/Roaming/FastGlacier/cache
    * Larger file will be inventory, smaller is sqlite DB

Todo
----
* add command line options parsing
* Use https://github.com/rogerwang/node-webkit to build executable
