# A1 — Danh mục bằng chứng

Ghi chú sau sắp xếp SQL12/11/2026: liên kết dùng hiện tại đã chuyển sang database/. Các JSON snapshot bên dưới giữ nguyên đường dẫn và hash tại thời điểm A1, không phải manifest hiện trạng; đối chiếu mapping mới ở [sql-reorganization-checksums.json](../coursework/sql-reorganization-checksums.json). Không sửa snapshot để giả lập lại kết quả PASS lịch sử.

## Baseline Git trước A1

HEAD local đọc trực tiếp; không xác minh GitHub từ xa. Hash bao gồm 409 file tracked/untracked không bị ignore, loại dependency/build/cache bị ignore.

```json
{
  "branch": "main",
  "head": "0315de8566d299472b28b2f10bb50326c7d6b9aa",
  "status": "?? docs/phase8-2-blocker-analysis.md\n?? docs/phase8-2-browser-matrix.md\n?? docs/phase8-2-files.txt\n?? docs/phase8-2-production-readiness.md\n?? docs/phase8-2-result.md\n?? docs/phase8-2-security-audit.md\n?? docs/phase8-2-test-results.md\n?? \"how -s --format=fuller 0315de8\"",
  "remotes": "github\thttps://github.com/88neverdientt-beep/fooddelivery.git (fetch)\ngithub\thttps://github.com/88neverdientt-beep/fooddelivery.git (push)\norigin\thttps://gitlab.com/java-spring-192006/food-delivery.git (fetch)\norigin\thttps://gitlab.com/java-spring-192006/food-delivery.git (push)",
  "files": {
    "docs/phase8-2-blocker-analysis.md": "aa346011fd4113cb32c58677a22d42d9d5357098ecfd0c5b7c956335fa360eca",
    "docs/phase8-2-browser-matrix.md": "3e000b865503f9016d5a16ac51901994cf4e846372015c5a08c89e226735cdea",
    "docs/phase8-2-files.txt": "0b5669ca8b8d5f32ed476c3b984e20e5ec0ed6abeef89c0ff3bb56e14440af50",
    "docs/phase8-2-production-readiness.md": "dd266ee7a08e423623d272f9ebe4d7ae925dca8686415c6b868dd88e837eed1a",
    "docs/phase8-2-result.md": "b3533449851e53316d05896d77aad7dfd970b56f165b5c7c8189a858473756e8",
    "docs/phase8-2-security-audit.md": "484920be135d9e0ac55e5351a7ceffcd2f26d086812ad5cd035d9843b16cfc8d",
    "docs/phase8-2-test-results.md": "1c6aefa58e49fd1a3e717bb61c8881b874908e79ac690498f8ce86ac8758b706",
    "how -s --format=fuller 0315de8": "da43ba2dbcbc1597dc5b7dc27a63bf4f48479c4605f506ef1b821d743e89adbe",
    ".gitattributes": "18be76f9008af08719be1d98d291e1286907ad6df86e7bd4e2dbed4ce0903fe8",
    ".gitignore": "9a9e0230c9cb7f94a54a5033d6b204d66287d0c97081ebe4083997670d89398a",
    ".mvn/wrapper/maven-wrapper.properties": "1f3cf0a7111d2b54736d1f89d7e93f1f143f8b3d5a58a5bb46e3b60b3eebd931",
    "README.md": "3b666cc438ad94d1ea484179ac44f83e99c7fffe639919d6bb4ece895757cfd2",
    "deploy/.env.example": "5ef76a4b86487c2bb3d5f6d7e65eb57f5f9645d16eebc4ec0597c6ae5e63c1fb",
    "deploy/application-production.example.yml": "4cf647eca45772ad6ecc184ec105582c47bd21e89d1d57466c024a24e1ac0ca3",
    "deploy/ci-readiness.md": "f4bf2f4ea571bb4194631dc12ebdfbd6709176cc494b351c9a4b37df96025b10",
    "deploy/fooddelivery-proxy.example.conf": "c2f8bc2ffb9ca39b9030cdeda66f040418fe93dcd0bab8480fd34ac012b9ccfc",
    "deploy/nginx-production.example.conf": "584a3a8ade109359fe4eba909573d5260de3f472ee561c8b31e243c618a9503d",
    "deploy/staging/server.mjs": "a2bed2418d41d1051d1db54ad351f26c88a75b261a070f8253f98d47d359b010",
    "docs/full-audit-files.txt": "0333fff69cf02b3c11bf30a7e1bb24c0a3818c8ca5b508fe5fb520fda57ec7c9",
    "docs/full-audit-production-readiness.md": "fbdb4a332d4443e7a4e1179907631e98bc1f9fca7efe284976fc3fc06b9750e2",
    "docs/full-audit-result.md": "61a423c086a28bb47380a26bdcfec697660310f3895ab1810fb0e517526d1b87",
    "docs/full-audit-security.md": "0ac30026d160eb32bcec64a32052e9c6487eb29211c1a24306b02764c67ca72b",
    "docs/full-audit-test-results.md": "d180765b8e9b35dea5f57bc75f4258545030d1683754167bcff402175e904b13",
    "docs/full-audit/README.md": "50fbb1cc0545d70fc56f423bfb18af3b8d7b8c4ef407da428df0cb9b69ced355",
    "docs/phase2-auth.md": "a8a92cf3a673c8bcb6de1ca03944901ff9d9820f7855e4d40b14700435a52594",
    "docs/phase2-files.txt": "376103b98b2d3f77abc83a51f7f895b4c903d52e426244174471013954433980",
    "docs/phase2-result.md": "1ba31721f7e14c459d429afb7df2a73297afdea6c36f02a915aa17c41d1bd9ab",
    "docs/phase3-api-integration.md": "3064bb7590089f086c9fc261134c74c27aff94d00a31290490b03f52ec3cb224",
    "docs/phase3-architecture.md": "f133868ff38659901ce3691d76e1a6571115f46cb9116380bfa26bddfcca8dfe",
    "docs/phase3-files.txt": "02048e43a408f87094a4429c7fa05c52e044e6c23e1ea2a9b798a3342445ef97",
    "docs/phase3-result.md": "25eeaf22080eed414ec88dbf2dd543e48a246b5c8fd1d6ee17e0df573ba52391",
    "docs/phase3-routes.md": "5c7a59ef4ac78e04862669aa52cd1a6ae41463d99f70254a9e4d1d02d3d335d0",
    "docs/phase4-api-integration.md": "3ff661b51342e727472f7b829ce05e36ee6e510f13bca57b54be34b3a831ea31",
    "docs/phase4-architecture.md": "275fab8f51500e5d6b4b274fd58a6549ba576b013a2dff2d253af07d5c91c5de",
    "docs/phase4-customer-routes.md": "427993f5068017e02094d0d4ca36e1c6d8dbdb9f00c31e05296d9bf28a097c4b",
    "docs/phase4-files.txt": "d47882b2131e1a03e415da454c72f5e1a05a7eb6fb154a74eaf693760974a3af",
    "docs/phase4-result.md": "c4db60a73677d66f02b98bd41fa377e726f600b1b26344005be04bdd2eb6798f",
    "docs/phase4-test-results.md": "400a132479a2986baebf155748c2cbcb889473064766a55c31bfda362d7d851a",
    "docs/phase5-api-integration.md": "114f478b2cba4bb9565674ee46798834bef7be0d6a8a60fae362a05975afc61e",
    "docs/phase5-architecture.md": "8b2397f5bdeca6939cbf85e10c5813106b354f22fc14fb90ca73e809f6b5f051",
    "docs/phase5-business-rules.md": "e6691879afac942c4bd85898acabbc0b621ed6a8ab70f6b5d002dc364d841c74",
    "docs/phase5-files.txt": "197943a0947cb84dfc5bbeeb1bfdc6a92bb53d3a1b069b0bb2c481122bef2c16",
    "docs/phase5-restaurant-routes.md": "0122e907e47be07fc4cdd2d472a8e770a166fa6fcb0a1a48396238e24069765c",
    "docs/phase5-result.md": "176283a7169c0e17b2ae2df9eddc9bacf2afe2d945a246598972eb76f17cc53e",
    "docs/phase5-security-tests.md": "e533a29f08bb580679d2b92f1c780b7ac9d632df67bce654d6b8baffad5d4262",
    "docs/phase5-test-results.md": "77c9c7406f830c3cb4c6e98e2be2ab482955fe38ac26eb3737a0e561caa51d48",
    "docs/phase6-api-integration.md": "a67c05f89471d20c7f65a82d363bd8d62439622c676d5f447ce07bc7c74b49cb",
    "docs/phase6-architecture.md": "8f7f2a89ceb7d448e5a7e4e40346e6d3dbea3517b06b4ac3edb066422d994bff",
    "docs/phase6-business-rules.md": "7b4842fb1c4ae0a655dd6c0f42278841168d8fa284d60c5d98d724c8fe7f4435",
    "docs/phase6-driver-routes.md": "615f4806452672b413e3d480016d1f44078eff2f84770523508becaf3b96691c",
    "docs/phase6-files.txt": "e32009a2a5d798b4716756725aad6d941c1573b986975d467905c7d69f3f83d9",
    "docs/phase6-result.md": "71a309c0b482f90e823c747e036fc14f0cda069abed14f761aa253f70e6d3069",
    "docs/phase6-security-tests.md": "648fe03de60b41db3d22e8c7974b0069adcd4228a35f2490f7210f60e0246065",
    "docs/phase6-test-results.md": "c8f1dffcdd6f72b299259f987cacfe333e0b6dd56344fc7557c58cad997fe34a",
    "docs/phase7-admin-routes.md": "4ab94baf3480fddf05d58c33af6fe2891ce1ac035ac396b8f35e3a8b27228928",
    "docs/phase7-api-integration.md": "53fbb89c8f85bf3907a84d045cb20821f2e952a4c861c4ed05ed5502a09fd0ee",
    "docs/phase7-architecture.md": "3b693619dcef011bbd6802cba99a23756f7f19f1a5866e08293af0e1a84b1603",
    "docs/phase7-business-rules.md": "c84b94ac4a45d145b2ddafb14d2aaddcae7fd8e922d4252b26e8da0e6db81a95",
    "docs/phase7-files.txt": "37468e51770417bbe3199e794490a9e6edd55ca9cf3b15708d9d5686e64c298f",
    "docs/phase7-reporting-definitions.md": "0f36f976b3a83e7b54cdd6e8636e30537874ff64d9e270600a9a33820019597a",
    "docs/phase7-result.md": "b695d0a05d417ba7bd9d30029f7c1602377defa5b4444bb303234649fb1e33f2",
    "docs/phase7-security-tests.md": "ec66bb7c2c4889b5db641585246636a54c2a76737a42c35b5ebd41038ea41a94",
    "docs/phase7-test-results.md": "0fe4e91c9f5db998d12629514f3ab843c73c71e85acc3761adfbbe787b11921f",
    "docs/phase8-api-audit.md": "fdf9d5779932399edfbbf5de28bb53b3f59c29848180937ee292525f33c31761",
    "docs/phase8-architecture-audit.md": "f72b213a8ea851d9476637e15034fc4d8d0e4d2d967119e14111f9a70616f0fa",
    "docs/phase8-backup-restore.md": "ef72dba69eed53cdd70ed55f232dfcbf1d4e59e220fdb7afa2f3176124403e3d",
    "docs/phase8-cas-proposal.md": "b7af241a5d7aa6d98be52447052abbf2b31c384962364f468dab34e01552973b",
    "docs/phase8-cross-browser.md": "c5ff6c7127c5e51b5b2db7ea75e5189fed2b26ab714358f2ab07f12f31ea16d9",
    "docs/phase8-database-integrity.md": "c496bfe8a7d63de4623a515fc9e7df39da942f5e3b00c5f23c5c1410da8aaf1b",
    "docs/phase8-dependency-remediation.md": "1765c5700d7d1b04ceb8804ca67253f20f1ef92000c596cdeba6c919af437e8f",
    "docs/phase8-deployment-runbook.md": "561b1e0f7ae7272af80e1a8c6af72d0b283911e097f82e82c78033b0ff994c98",
    "docs/phase8-files.txt": "7387a1130874d6b1c4f8aae195ebd1aa61876557223d69703dc6aa1af7adc1eb",
    "docs/phase8-performance-plan.md": "6eb5710b12fefccdf71cbcb85c10c05663f03c0fe66a0af8a80f8a7d2fdb85d5",
    "docs/phase8-performance-results.md": "1d663ada96725917d37fc638dfa605de758faec8ddd6511031f8378ea57f133a",
    "docs/phase8-production-readiness.md": "e50e861527e40773a09193152084b2e2050f8f28944a2c0aa9c454195c18cc7d",
    "docs/phase8-result.md": "137ef3a48331221a4815b2e384b142dd547dde7006c2c11ddf1cc26b4a54f4e3",
    "docs/phase8-rollback-plan.md": "52bf71d5af8bd68126f6ed9675db318913c612c8d9296c01a849837465c5aff8",
    "docs/phase8-secret-history-finding.md": "9bf961deb7eac33b117685b686c2d52725cd819eaed0b4f74bd66dc04229762e",
    "docs/phase8-security-audit.md": "956d1a118daee8d50c906d0d340f0457afdff2bcc6078f3a04c33ca0a00490b3",
    "docs/phase8-staging-guide.md": "7201219037ef532614adcd2afaa69f0d9c32f53b45addf9eef4783d2b5ffda0f",
    "docs/phase8-test-results.md": "1c3095691de8886a0c190b6ce50eb6980f7e6ccf23d08626c5c59c0ee9d3e278",
    "docs/security-endpoints.md": "3468c3295edbc00612fb89ab992f0cc628a80e48229c4756fc838352a6ecd3de",
    "docs/ui-assets.md": "efd4b9f2063f21f5ec3ce90ce53a71532afb930e14a8a811db6caa98d0a0c015",
    "docs/ui-design-system.md": "3d0a1a11f33f3c3b2e628c09c191cbdb7f5f1ce15560a5e17f954a7a7b10d11a",
    "docs/ui-upgrade-files.txt": "bb3b32194760e5677e3d67da8d642211f8e1d87b661220a409b6070f69159e5f",
    "docs/ui-upgrade-result.md": "ecbbd8c69a8c11542a35ed15f9d960e8c4c3033d9f7d259c6baab139b03e42b2",
    "frontend/.env.example": "eccf4de86d0843d78c133bce01094b7c11b1bb52c74927926ced0f0e417b492e",
    "frontend/.gitignore": "764371b8c8c2dcdcf961cdcba5419b5048121ce2a70601b6e235de0475debfed",
    "frontend/.prettierignore": "db6cd48a4550aabb407d020cb6999cef5d18a7e0116f3882575f28371d3a42b5",
    "frontend/.prettierrc.json": "f583ff6d8ba542b76af46c4c024a0941b77aee51133bb0f69ec6eb1fa613de7e",
    "frontend/README.md": "5f97973de4befa074d52f378d62545e504561b0a92331324565f6c37c2145022",
    "frontend/debug.log": "5a726caf264fbc30b4df42bfdbad3b255456d1e5d2d82a248fa9e4ba8391bb80",
    "frontend/e2e/admin.spec.ts": "eb3b14050d893ff2442419082c5cb228962bd129857e4e98b21b93dc4a962256",
    "frontend/e2e/auth.spec.ts": "65b2472f551652498f93e16760d43df258b55d2bb88040ec2fcee1d143024301",
    "frontend/e2e/customer-helpers.ts": "646cd7e1d726b698bc17a33d0b8ebd2a876d076acc1090351c473757dfa03f1b",
    "frontend/e2e/customer.spec.ts": "cbd2dcf3f4ffd0b54474e2e1d61174f45962660d4cd219b491460aa77fcd2413",
    "frontend/e2e/driver.spec.ts": "71ec5f3657bcb15a2a1e577cf6377a292c9b8321eaf9708704195f8097342945",
    "frontend/e2e/fixtures.ts": "6263f388fd2e36df776a280c926bc804aab91c3c8d8a7673829cc756cb98e83b",
    "frontend/e2e/helpers.ts": "43677e78369682659d39971f52488b7c7b4d72d9425ce5bb00f3f0bcdbb94c04",
    "frontend/e2e/phase8.spec.ts": "d0db1227055c36339a5b848734e463966e13e09a24b3f9c9f2fe0e5545b50b99",
    "frontend/e2e/responsive.spec.ts": "907f6aa720dfb2f8937a31348a672e519768a4a202793c5d9a5e25926071f0d4",
    "frontend/e2e/restaurant.spec.ts": "d5af93ac0becd45fedae578371cb307ed53046c3510d4c3d8c9707794844bfcb",
    "frontend/e2e/ui-upgrade.spec.ts": "52890a5e09d387544a6a790f39fbffe37988b1c9be279923ed4eae2bef003aa3",
    "frontend/eslint.config.js": "b26bd5735785cc23df158532e4e72eaa356599c1cd32ca9eb3e1d3efe48b8fd7",
    "frontend/index.html": "74f66ed40595cb5e089e3fafce0927523d22d7db6717e122272a7a172ac07c60",
    "frontend/package-lock.json": "1d8a2069e9c7c3657d13df3439993652f3b02ce08701a19313b1c3e6d8a9f4ef",
    "frontend/package.json": "1d323d99ddf06e2c178258416f2a5f6829631c979040dcb7f4556f0058c0488e",
    "frontend/playwright.config.ts": "a89731da7f3e8a8e49a23b406a69b354db2cf9b7e9a102b230cc97c5dc1fd681",
    "frontend/playwright.phase8.config.ts": "06601a7f0263587dfa13ccc23ce9551c0b5cf2dfede8d3d0f9cdb5cb3659523f",
    "frontend/public/bowl.svg": "dc576ca0c2da8c9bd5b6a4885d2bb83235a6f1efe31c17d90097470730406454",
    "frontend/public/favicon.svg": "a6f273fc7a862604f00389de9d106704ebbd355d3ebc520a9978eb62d94fd4d8",
    "frontend/public/fonts-license.txt": "0bd4db1cda123af9d91794b0f98324b7d7d81aef0fcaf78c433160153f2c6f25",
    "frontend/public/images/pho-v2-1024.webp": "35756c7568bf1dd74d3518f3a2a16edbe9cb536682a7081a824a0bea4626ab17",
    "frontend/public/images/pho-v2-480.webp": "ae59b2f61725c1e63b75009ff0abc62c43f63a011e5f528061a8f56fcb327258",
    "frontend/public/images/pho-v2-800.webp": "c8e92903529ee29e6ea1421f0436e8bb448eab2c756d7318286093eba1d2fd03",
    "frontend/public/images/rice-v2-1024.webp": "f2f8b71b3db6b9dd52afef5e5beb7668210b63235f2d6f76b6149ec92f339443",
    "frontend/public/images/rice-v2-480.webp": "fb14ca594bee09859426ecdfc36c279ba438066f2df36bbcca7aa81040cf7d34",
    "frontend/public/images/rice-v2-800.webp": "0440e364f6b8cbd7ee40af98a481f16da2d6c8258f47751db9c494426a413f38",
    "frontend/src/App.tsx": "6d61ca9efa5faf3685ff768bf3fc1644150c51063e88a8999c9e544ea32a5163",
    "frontend/src/app/guards.test.tsx": "126a2e8ba5ac43cca373c03425b7a26f71a75fd540eddfa3689b523aa0159be5",
    "frontend/src/app/guards.tsx": "6c0915cdae6cc4f5f6425f1531ece895d8961f1637979435ce434b5f7f7534a4",
    "frontend/src/app/router.tsx": "aeea87b66ddbde61d01e9aa430f02f02a595518b8713c05876fb9212bbf727bb",
    "frontend/src/app/styles.css": "3b24b9eeb6965dc807e086ad8c563d44c483c257fba9e2015e9f46847a69c894",
    "frontend/src/assets/food/pho-v2-source.png": "f4a7b12d9013c1127d3f2c76e6baa1a6d3409367aaf3f1cce7882430ae129d00",
    "frontend/src/assets/food/rice-v2-source.png": "fd4f881ef826d0d69901542a8fe64491bdd0ac3ce99c10a64ce13faa561978ff",
    "frontend/src/components/feedback/index.tsx": "9af0e8fb37f8ac78bc13cc826717a4cfffe3c0b25a669f12528de483a64856c6",
    "frontend/src/components/layout/AccountMenu.tsx": "d799be01a47e716a7239a0c884f4d57e1d46ed7ebf9e99b1e5f45f15a590d1b0",
    "frontend/src/components/layout/PublicLayout.tsx": "7837b4d20382e1a5683f50d4b32e9336840336aa904587c90caf211add3ca915",
    "frontend/src/components/layout/mobile-navigation.test.tsx": "3e42a7555220ba37c45f60c11edade3d3d2f3cb9addd77875a7fc08a404983ef",
    "frontend/src/components/ui/Breadcrumb.tsx": "b9c247a3dbbf2b8394d8ef7967b9e993a79c822eb26c42b18117ecee4bc3554e",
    "frontend/src/components/ui/ConfirmDialog.tsx": "b9ab40b7aa79c51aedc94df6ac397692183bbd15c4675c86b012545c43ae784d",
    "frontend/src/components/ui/FoodImage.tsx": "72041515891cd89274809bd4b37cb32c1f7965d0a03d3c6dd106dac18b43caef",
    "frontend/src/components/ui/UnsavedChanges.tsx": "c63b6c79da746416d0e3413436afc3cbeb5d3c09ae7db8c985ab50aa503f9a93",
    "frontend/src/components/ui/index.tsx": "27858f98c4b8e88dbf739165b49b5933abd00a08318426c42dd06ec401d23198",
    "frontend/src/components/ui/ui.test.tsx": "26ddd99b838ce4a71b04598afb675a59ccaf82444a7f5e9249fb2552cdde8831",
    "frontend/src/features/account-revision.test.tsx": "4793770bf5e0bd59685615af8d19d6a95b92fdcf9ccbf66488be965bc1fd47a0",
    "frontend/src/features/account/AccountPages.tsx": "b9ae42227ca7918b127f942ea702b7917a636bf68252c627f40c82806205dbf8",
    "frontend/src/features/admin-management/AccountPage.tsx": "b99e636c2c46c32f7a1f6d017b074e776d4bc818b1a1f4634ae3549c07bf1710",
    "frontend/src/features/admin-management/CreatePages.tsx": "49eca67288864e0e77b41fc293246e4845017cecbc4092630bf0aa53301ac01e",
    "frontend/src/features/admin-management/DashboardPages.tsx": "d0428fa34c6eb6090cb69db1b2a63dbaecc6b9b85f31844c98764303cd8ae9d1",
    "frontend/src/features/admin-management/DeliveryDetail.tsx": "b42f474c23da6470045d53df2ed56537438de6ab22e6756fd0c826f1a10b6f0e",
    "frontend/src/features/admin-management/ExistingPages.tsx": "910b9d062c68e6c4142067528a379e9458feb9f0d59319d108a7492644e85df4",
    "frontend/src/features/admin-management/ListPages.tsx": "a9e63473f6fa2f5d53cc0a93bf07cff3584b5e30aed33551350f9f72a1586172",
    "frontend/src/features/admin-management/ProfilePages.tsx": "e0638021afdcc9dd95c8af3a4cfa7cdd7f3372539226f8822d8ce3935d1aaffd",
    "frontend/src/features/admin-management/admin.css": "2a051515a14157056c7f6371d9c031ead2baf26e1637aa23d77e1f7a0244a186",
    "frontend/src/features/admin-management/admin.test.tsx": "7a38231eb93056119aa60d69c8b4c3fb53a2ca5d8c11fad1f443625582c9528f",
    "frontend/src/features/admin-management/api.ts": "a8885fe82e270cc72aa4d3ca4f7a04db0966f15a7e284bc7638ad5a786a99f4e",
    "frontend/src/features/admin-management/existing-api.ts": "f8bd996fd3fde5bb08f1efc1793f6004584ad16dbddf2b8b9cb265c536c09cdf",
    "frontend/src/features/admin-management/model.ts": "5db543e315ab13f384e3419851b7241c5be340ac279e8b26caa40a49544607b5",
    "frontend/src/features/admin-management/shared.tsx": "e3ce96644724ba099aa5f60930195032d0d98f7a3970a555b6d57ccd405401ee",
    "frontend/src/features/auth/AuthPages.tsx": "b811ab8fba7462e7313f426e76417f9e22af31d8e1d83ddd7cd9ffc038b4e145",
    "frontend/src/features/auth/AuthProvider.tsx": "6929324d1f391529fcaef786375ed5f565499bc7f6bbb6dbfdb9c5b117bd4dec",
    "frontend/src/features/auth/forms.test.tsx": "6902630b9d9553aba67f6daa305ea946641d633cbca78e78b512302beb98f0e2",
    "frontend/src/features/auth/gateway.test.ts": "4fa352e775f0fc7d7ec04b2dc5d5ab72f0a1ff51f3718c69408e2f6565bfdd9d",
    "frontend/src/features/auth/gateway.ts": "8539e08e2f5bd42716eef6594f1854c79a7c30e74acbaf15c2f235e1b7eeb5a7",
    "frontend/src/features/auth/query-cache.test.ts": "d200a3de89948bc9adf3e8066daaa102ebed0174d3adf4b5e555947355df618d",
    "frontend/src/features/auth/query-cache.ts": "0e5d7b534d6ac44d63866680a8c90acb3aaa12c7a1da2e2a2311e2c0336965bf",
    "frontend/src/features/auth/returnTo.test.ts": "caed43e047720a0937a83aae8f4566eda1616611bd1670afa0468e7c1a491c90",
    "frontend/src/features/auth/returnTo.ts": "378a971e5900d68750018a1a81ef7cd9b0f40824b91434741ae039a8d8adb0ce",
    "frontend/src/features/auth/session.test.ts": "bab5fe3d2c2e37b8be398d471853b5152768632c3793fb66252922ed68d4a2de",
    "frontend/src/features/auth/session.ts": "ad3381a4b105f46e4f4b25744012dddc4e7284592e565a7c428001441e837b06",
    "frontend/src/features/auth/snapshot-publication.test.tsx": "959d5fa190d4df07222aa87b310ceafc93191fad6ac283dde2fd54ad9f418874",
    "frontend/src/features/auth/validation.test.ts": "c4f61b1430f92ddb46a835f54a7b19c2b36864777f4c764126607e060afd6bb1",
    "frontend/src/features/auth/validation.ts": "77f6c9cb117ae1a2c712f332d1e20dfb626f4910ad0d38ea2b8a5d0320a8847a",
    "frontend/src/features/cart/CartComponents.test.tsx": "c54ca4eea2221d1621666690febca1fabdb4e7607d80cf14bb8f9b135ea5b576",
    "frontend/src/features/cart/CartComponents.tsx": "ee533676f50567f2a227482450c12a46c40e6ec845c660918d5cefd1e8081e96",
    "frontend/src/features/cart/CartPage.test.tsx": "eeccfe98624c843cffbe945d597bacee5e13042c455d9c23275710174aa88412",
    "frontend/src/features/cart/CartPage.tsx": "4ac13f306cb03bdc4e84ed7212ff28d6e5095e3675569834bda7176551664fae",
    "frontend/src/features/cart/api.test.ts": "35c448fe17617f86232168b63b26af5a44e4eab4ed6ff82926ffa90d6bb56f3c",
    "frontend/src/features/cart/api.ts": "92ff720f5b5b437fdf4ff7088246759e1187a4a6575987ca8b154ee52a7bb552",
    "frontend/src/features/cart/cart.css": "e99b7a0df5499ed624bb4a29f139ffa48da7ec564e8ec38a97d1c48f6b69feb4",
    "frontend/src/features/cart/testFixtures.ts": "dbfb625a09980ed2761fc07c894090668c513a31406461117e4427b5104b50e4",
    "frontend/src/features/checkout/CheckoutForm.test.tsx": "db6b6a4131d05e499df28831124ec25f807490c364387fa37f6a6687c90a1e96",
    "frontend/src/features/checkout/CheckoutForm.tsx": "f688271f3c42459286269cbdfb0aaff379bbb5899c7f82ed153e5c7f958095ec",
    "frontend/src/features/checkout/CheckoutPage.test.tsx": "264a36f18ad5704adc77e30648ea8715e7ae65f0091f9604f6d5f8e2f8ca9fce",
    "frontend/src/features/checkout/CheckoutPage.tsx": "1f33214ac232c588d73e19f761d46950da0a21dc0df410bef19189b62dad8b8f",
    "frontend/src/features/checkout/api.test.ts": "7d9c24b78ab7aab27f2be16995fafd373bcaf396d976c07df34a0432654da4f5",
    "frontend/src/features/checkout/api.ts": "8ae1a786d6f8ee9509287919769709380541a618897d2d628b6bcea24999b117",
    "frontend/src/features/checkout/checkout.css": "37843b4429b7711b4ea1a2fd6014188cbc482d2bc1554f3537a4385887acfd8c",
    "frontend/src/features/checkout/model.test.ts": "bfe7de9bb88de59295e05d134b39cc128763271ee7e535b76b4a74966170cce5",
    "frontend/src/features/checkout/model.ts": "d3c6c7604a53e8420635accbff429704d57fd60113d96866582c07edf2b0d36c",
    "frontend/src/features/checkout/testFixtures.ts": "21f5e26cb2e7b7807eacb1644a5e0a60e56b0b50f2f358be2754ff76129ad3aa",
    "frontend/src/features/customer/CustomerProfile.tsx": "e60e8014c3ebc9551908aef62a82b3625028053698b1ad2bb74309df1e6ac870",
    "frontend/src/features/customer/api.ts": "ea8a97f4bfe9d73b75cd311eefc0bacac078004ba660d222a10b3822cc98f6c2",
    "frontend/src/features/customer/profile.test.tsx": "762b4b949591337c8c1ce51c2300c47ddb075e07ec17b15a45edce40449c929f",
    "frontend/src/features/driver-management/Components.tsx": "8477954d02f50133feacd11a1610cfd7c0441c473a24cb487cb6bd02f3357b6a",
    "frontend/src/features/driver-management/DashboardPages.tsx": "81208e7a28cf057019f8dbbe5dabe5211c054a8fa505bb10ba738b43066e1740",
    "frontend/src/features/driver-management/DeliveryPages.tsx": "6193497f05b0d51c2dce6d79d532f4808f2cda78c0d8a36740e4355ef3eaca36",
    "frontend/src/features/driver-management/ProfilePage.tsx": "4d9c2993a23854d22a361734f36b6392f28e1a785d08dc71c5f11bc2a1e74444",
    "frontend/src/features/driver-management/api.ts": "dac467964354c9a839d7eb1bc55a91899baa852798993789ab5b800fd250f9bd",
    "frontend/src/features/driver-management/driver.css": "40652ba0ef937f9f046e42700f69035f9c6773aef491b8d0a62a7462b54699fe",
    "frontend/src/features/driver-management/driver.test.tsx": "53f38c2d9cd09ec758b5c687d8d5643e52827e835262ff9bd70cd0a2af5871dc",
    "frontend/src/features/driver-management/model.ts": "2be36601259152e7de38a402dc5c401e9e2b8bc053b871c3522f632f4f7e50dd",
    "frontend/src/features/driver-management/shared.tsx": "075bd40504b321193c11a9ecc09c48e6c36aef559871a90e853c60a06688d217",
    "frontend/src/features/orders/OrderComponents.tsx": "3f5814a70707a1287ca5d00fe8e50c2bb8c644d2eb2cff9449ba526b15b7ebe8",
    "frontend/src/features/orders/OrderPages.tsx": "1827aa11d914c085c0671b55ddbd4201a0bbd17b0bd51d4c8d538885e4439591",
    "frontend/src/features/orders/api.ts": "1baa34c2991ddb859e0e3052a6a97c20e23e537911acee76de290a5a727ad0f0",
    "frontend/src/features/orders/model.ts": "27c3210fa2956ce839dcd2f9db82f0962055a009b0cdf0a38e84c4d36f44d5f0",
    "frontend/src/features/orders/orders.css": "767f63688cd1395675c4219ea8c5f92067fd1d826dc965c878f73e534acbe227",
    "frontend/src/features/orders/orders.test.tsx": "d847fc8adf4d7382f867b9f2d3527e71d3b6481bb07b6d341702fec8d5297274",
    "frontend/src/features/public/FoodCard.test.tsx": "b013decb4e9733f6d668bca695f3fd360542efd19ff949be65efd03f40580307",
    "frontend/src/features/public/FoodCard.tsx": "37a727502cd395e417b832abb6473f0b87fea61854bda53d0b351055513b244c",
    "frontend/src/features/public/FoodDetail.test.tsx": "d5705662f402d43dd42077e5cfb30dfbe92161b0b820e8e831cb58d5987b17af",
    "frontend/src/features/public/FoodDetail.tsx": "4dee9b3498928549a89821c98b80a92c9d83cd5d053b3c71f6ea7198e0002c65",
    "frontend/src/features/public/PublicPages.tsx": "b7ef683ba8227eeb214522f194f8526ffc1dd892bb96aee414473ad97a834643",
    "frontend/src/features/public/RestaurantDetail.test.tsx": "426f8f1a2d815b1ea89955ac5bde43420f68495b5acd75bc8e4c3797af5530ee",
    "frontend/src/features/public/RestaurantDetail.tsx": "96e1d5bbb2c6386c3548774bd572f7a80d4361c4a1a9c8915f4d6f0c2fd361de",
    "frontend/src/features/public/api.test.ts": "9e4acdd62d3d966d0b222032c0d42f9a2272abc12a0c826a7722ab710f627071",
    "frontend/src/features/public/api.ts": "355c9d7d6b61bec44d147fe5acdf3f369fadc46e086bf6b3c82fedda5cc5d9ee",
    "frontend/src/features/public/customer-menu.css": "fe3aefc1bb8f9f5f4d307da67131ca0abee8d30dcb15c3c45d30b2cf0162a468",
    "frontend/src/features/public/discovery.test.tsx": "aadcf6450325dd902d67089b0d2311d98ebb6933096b23bd520118f8d7e9e0e8",
    "frontend/src/features/public/model.ts": "c6e400905c90dd802c1dd9590efea3238adaf7053857c2dd7581235405b12f20",
    "frontend/src/features/ratings/RatingForm.tsx": "1be9a74a60a59f527ab7cc6b45f9ae68a843bbc279058f0aaa03e0b1eca7cd1f",
    "frontend/src/features/ratings/RatingPages.tsx": "fddadf0a19165f01d85197af74a1525ccd4231263b97a01d4e889e12c2a1e233",
    "frontend/src/features/ratings/api.ts": "0ce14f651b22f648b44ac950be8ddc0cd4e29fc3fdf3a5beff6f7c77f3838456",
    "frontend/src/features/ratings/model.ts": "d7db447f6f7bfdda43e782d7bb7757e6a9b1f4ad5c3f07d708da46c36ea345ae",
    "frontend/src/features/ratings/ratings.css": "dfda1c6f321e586356a3bf0f425c64bc21727506de797a803de0daefd6c209c5",
    "frontend/src/features/ratings/ratings.test.tsx": "f9535140d553c6414ff9b7b87f51e85d55e6797dfdbaea7e3bb9ae31acf58437",
    "frontend/src/features/restaurant-management/DashboardPages.tsx": "cf67f35741390abac7c09d9e0b5b23e79be9e1a89ea2c1c2392b517ab2e98b3c",
    "frontend/src/features/restaurant-management/MenuPages.tsx": "43cda2043c99602daa4d549751e40686f1c2587bd0bfd1a0e8c9f634558f3242",
    "frontend/src/features/restaurant-management/OrderPages.tsx": "06fafb077bcca23fa7d579feacc50266e868a18638b081d981752dc097b80e60",
    "frontend/src/features/restaurant-management/ProfilePage.tsx": "e5bac3ef83a5e02cef55a927f4d2776683de5a953508fbb27e69d8d16f290d99",
    "frontend/src/features/restaurant-management/ReviewsPage.tsx": "c95c3265da01c1457a9c902ec29656ac982afdabc6242c1cfcdf522a33777145",
    "frontend/src/features/restaurant-management/api.ts": "f7069c8c20de650ee3cd4a69ce4c0b7bbbeb935a7f4be3410ecb2d23bfc82cf8",
    "frontend/src/features/restaurant-management/management.css": "bb2cd555031dc8d19a6534782f79426d28d24621ab5c6be6978df15387d3b0dc",
    "frontend/src/features/restaurant-management/management.test.tsx": "fe189f3f588d48cec9fc2d261a0329f03937878f3b6b9f3c651225afa06792a8",
    "frontend/src/features/restaurant-management/model.ts": "b8590079c7da148034f408f9f16a37602e23f451c01b845a868b7f902810d057",
    "frontend/src/features/restaurant-management/shared.tsx": "45c74538b89898dbce979561b40bba2956581660b43746d67f79984bc66c3240",
    "frontend/src/features/workspace/Workspace.tsx": "ce4b0b137e88623448db7c829453cc521bd52722f67e8d16937c7f7a4540b160",
    "frontend/src/lib/api/http.test.ts": "b891eb824ea1d8b858426c6d323a0ba92a721b0b98401ae2f3eba6c557edd8a7",
    "frontend/src/lib/api/http.ts": "88713a2350b62403024ee1d89de4cfadb48b08c8d2da1147967cd415b1ed09a5",
    "frontend/src/lib/runtime.ts": "91021a967d95e141b64f17ad69e67db22c755ae851720843b1379dc5b8e5ab1e",
    "frontend/src/lib/schema-config.test.ts": "4fc0133d3abbf369e5880662cd22ac643a23be937e9d28ed03093ca074898c95",
    "frontend/src/lib/schema-config.ts": "dd10bf3117d670fb224c427b3bf2c325c0e57f2ec0f9921e2c583acad42894b5",
    "frontend/src/main.tsx": "69f869e43916a28665436787fe6fe21d7f50dd6b3e9d63eb3099581485b4127c",
    "frontend/src/test/fixtures.ts": "8ac9bb4266861778fc66032f5637289b8a127923954a2125528b3fd7c0f1ea6f",
    "frontend/src/test/setup.ts": "d58661bbac73c879ed25f0a4ab263d8d3b27c5eedbb8564adc90b8ef6e96717d",
    "frontend/src/types/domain.ts": "01224eaee6da7d7da3e87329edd0a46b7245a9c7aeeb65aaee7085a6290aa126",
    "frontend/tsconfig.json": "e46429976176e0d594672e89eeda0ebb04fa19e7134944957062854d76f3afb7",
    "frontend/vite.config.ts": "97a5b9aba2f30b3aeb748041535b28da4a902dd23b8831c70350119e7d476548",
    "h github main": "779381a9d9da4eae2f1f18acd6f4ea8c7c29d52b4bec2ca7b73fc9ef8bcc15e8",
    "mvnw": "cae96cef89ebea3531221f4ae17c23cf8edf67d00eae8306d4186ae1bbed4d02",
    "mvnw.cmd": "46eedb8419bd14fe70d5bb2916d7b6f51806e51b39d5b76a42610384ca929c1c",
    "pom.xml": "dc3c05f2c3a14ff20b8f76f8e5ba930fb6f3fbc3aaa90830fd7667139186fdc2",
    "scripts/verify-test-reports.ps1": "d0ab3dd354554fd5f731c96d5ecfa81eaf5e76821b805d4ae622f9300f2c35ab",
    "src/main/java/vn/gaugaugau/fooddelivery/FooddeliveryApplication.java": "ca011b9b03e081cf7d6adc456cec69ae842c4aa3d050e098e128c814584823e3",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/EmailAddress.java": "308ee77e9fd17251808809a08ae4b49987c55813addf0ddf418e6b72add13219",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/bootstrap/AdminBootstrap.java": "710ab3985c8aee3444983e67c60b791a81e3a20416471a58e84066120438300e",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/config/AuthPersistenceConfiguration.java": "808023415dc5f3b1d1579aca0303e0a68e03e9c293011ace8c47615a6ce06993",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/config/AuthProperties.java": "fbb77c7a4bd59b87a3816955d73910db5f99ca6b7ecb3eb08c282820f2a664c5",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/config/JwtConfiguration.java": "44f2a34340f8ecf7cac375f2ff1d4e216c2924b5d03ea9f699cb0e8b891b913b",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/config/JwtSettings.java": "e3c14a304161592097a5d7ac564cd82ad64a68ae80e16d3f97dbcf3c5656e362",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/controller/AccountAdminController.java": "5c3e41b7fc585c00d3a28c27124f2442a32e722a3d99fbe4e853df817a6dab8d",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/controller/AuthController.java": "1c672b8a52e80a7310c53017c461a5a88506f77f4ed0703e0ebdc3cd3ef85d82",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/dto/AuthDtos.java": "d4cd674a9c6a1f8d8ff8bc9fddf64b859f905a0a40d12aa47ec418ef7395e7c2",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/migration/AuthMigrationPreflight.java": "5ab31a9794105d5327e8815982b29fd057c0fa39ae2c3b5e26e66a06e24893c0",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/model/Account.java": "5864c58d3950864dc6ce55ca19945865778afc3c879b3554c5647d57e66348a8",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/model/AccountStatus.java": "022dc28c03ac26892b866131974228654b85b8e67e94ca7ac0fadc864de2b804",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/model/AuthSession.java": "d5c7c710709070a3a7e87f5dcb23f4f49311a1c153265119e4e3f8830e2574ef",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/model/RefreshToken.java": "57934ce7d0a30318d2720cf5f520af7aa664e89058ea18ca4df5be10f9cc4e09",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/model/Role.java": "f12046911180b3ee71de089d9657bd1a696f473b2a56b1352684b144146b08d0",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/repository/AccountRepository.java": "cd830c5ccf478bfeceac8df6948c9ac4a6d2186ec6d3d0a8331d16a9b284ad99",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/repository/AuthSessionRepository.java": "6778701a6ceae3cbdc691dab5d9d11b6c6a867e0c5b8464c87a510b39521cb29",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/repository/RefreshTokenRepository.java": "e6d33f78a033b3b988f596f759e7552474c5501688ab29430be17b0d9e8ae6b9",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/security/AccessRules.java": "0ce6bbd96f1ac0430c802504e1769056fa01b49f8725be19594bc81a84ce1f9a",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/security/Actor.java": "f886c2ef72e7a41e44df2f6227ec492e80c76689ac6f5330c6895c51e4dba924",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/security/ActorAuthentication.java": "41f0f8652389c46d5ada3ace305a17bf91328a37e41dd7d595827b42825232b5",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/security/AuthFailure.java": "f27d21adde63bd6d1aa37edf20e6caf181ac851e955c09e5723c232788efd9e1",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/security/CurrentActor.java": "b3f30c655db9603059eb99c6ffe2bdc4edb4c10140a39c06a182227bf83b4b38",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/security/CurrentDriver.java": "a51da7b6e3cc33ddada1a91d23f2afc9fab94ab77f27823ac9c5538aee9f008d",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/security/LoginLimiter.java": "bc20884c6249b7420ea50c4922774c721607053e39d869ee87b17735a2649301",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/security/SessionJwtConverter.java": "7c4a9bddc405a1edbe664a540fa044af2be3fa912cc93901bab7265430094efd",
    "src/main/java/vn/gaugaugau/fooddelivery/auth/service/AuthService.java": "466e03d0384709cd1b482a627a6761b1f182967c8a99233ea52cc8d0b34537e4",
    "src/main/java/vn/gaugaugau/fooddelivery/config/PersistenceConfiguration.java": "00afc3e3b89dc74846ac8177977e17ce62f93780122d783c876601d762a12ca2",
    "src/main/java/vn/gaugaugau/fooddelivery/config/RequestCorrelationFilter.java": "3dbcaf46145840cad82648fe5260f0bcbff9c8c1eae9eb53479c22ed9783903c",
    "src/main/java/vn/gaugaugau/fooddelivery/config/SecurityConfiguration.java": "e341dabc6d0333e36eb1abb196c6becf0f790c58dd111ed2a0aceff9c87886fc",
    "src/main/java/vn/gaugaugau/fooddelivery/controller/AdminManagementController.java": "1ad985a2037038b81a2b2605886ef2ab4d0c23790668da183c2591d5a92c8e9a",
    "src/main/java/vn/gaugaugau/fooddelivery/controller/CartController.java": "9377f0cdb123f18a73b2b33a023a0dfb54bb6b2464e103318cea4acfc6418b31",
    "src/main/java/vn/gaugaugau/fooddelivery/controller/CartItemController.java": "5b35a5a4bca944900052e04b7e248de8605f445338d5bd0bc7aa0d0f9957fac6",
    "src/main/java/vn/gaugaugau/fooddelivery/controller/CustomerController.java": "a4cd8711d18d2cded465304d34d791673d6852c63fea7f3d2a5113186d6ccb33",
    "src/main/java/vn/gaugaugau/fooddelivery/controller/CustomerReadController.java": "113271d56309fcdde6ce96ef2a0a9d1b9bd1030a721205c3e601f1c1120a6965",
    "src/main/java/vn/gaugaugau/fooddelivery/controller/DeliveryController.java": "abcda12ded9881015618dfd66f07c7ac40d054e70ceb2925cd4eae822de1cdab",
    "src/main/java/vn/gaugaugau/fooddelivery/controller/DriverController.java": "d9f9293fbac3acade212421421383af53eb22e57c3bbdd998477fca00edcecac",
    "src/main/java/vn/gaugaugau/fooddelivery/controller/DriverManagementController.java": "993052a8714aea1ae2487e854d76bb7db2686bc37ad6430556595c8dc56acee1",
    "src/main/java/vn/gaugaugau/fooddelivery/controller/FoodItemController.java": "287409a77457cde581c483a7b0798c34cb3b95f607410f99e6452c7423afd519",
    "src/main/java/vn/gaugaugau/fooddelivery/controller/HomeController.java": "b7a2d35abd0d9d6b9836367d758baf8163744ad0d66a048804761d6dd6d3e72c",
    "src/main/java/vn/gaugaugau/fooddelivery/controller/OrderController.java": "34185ca852fb281ddea2c7ded78f4362c5493d963f75e4bae53f5394fe9e7e2b",
    "src/main/java/vn/gaugaugau/fooddelivery/controller/PaymentController.java": "c4c95202beee739a7de59e4679177c6fc84d5fe83f28a9973755d05d816aa6e5",
    "src/main/java/vn/gaugaugau/fooddelivery/controller/RatingController.java": "5bc1715fe5cb5e2791f2b07061cb18dd46be1addeb810f659c2cc903af2e73a8",
    "src/main/java/vn/gaugaugau/fooddelivery/controller/RestaurantController.java": "ceedc00e0979182b25766dfd695634a17379d075c9ba00f05b541dc745c9d5c8",
    "src/main/java/vn/gaugaugau/fooddelivery/controller/RestaurantFoodItemController.java": "0ba3e0c982f82baab8cfca06e7ed1e2eda08b001a65417b9cdb6d11eb3326195",
    "src/main/java/vn/gaugaugau/fooddelivery/controller/RestaurantManagementController.java": "4d8729cb3bf650c9fa7bc590b8f3fd436e32b544edad0e2ebb7ff52e74804b62",
    "src/main/java/vn/gaugaugau/fooddelivery/model/Cart.java": "9ef482f11e79e2011c7b41b98154b7f70814df02340547a9c53a24d565c9e431",
    "src/main/java/vn/gaugaugau/fooddelivery/model/CartItem.java": "3bc76ffe81778574fff8c034b6ff328258807b8025f85750fb6886332cea0845",
    "src/main/java/vn/gaugaugau/fooddelivery/model/Customer.java": "473c6579724b5ea59b43253e9de30aa8f99e0dc54dba62849a5b314f1cef539b",
    "src/main/java/vn/gaugaugau/fooddelivery/model/Delivery.java": "705276e9b8369775cdc0aea63d98c17d62190ecf8a582572a8d991b04f4ef48d",
    "src/main/java/vn/gaugaugau/fooddelivery/model/Driver.java": "051f9a1f9602217c354c0d3f153b08633d255daa171bd0510ce0c1da43d97cdc",
    "src/main/java/vn/gaugaugau/fooddelivery/model/FoodItem.java": "5725deb5f8082cacf0648c6db5bfe89fda6738a75591e01aa1fdd43df074af13",
    "src/main/java/vn/gaugaugau/fooddelivery/model/Order.java": "20311389912ecd4dadcfb209d7c49d3bfc3792e3106bad44d6df41f96be5fb1c",
    "src/main/java/vn/gaugaugau/fooddelivery/model/OrderDetail.java": "fcf03081b47647406a560103d44b800f29f890a75761cb721ae4544ac839839c",
    "src/main/java/vn/gaugaugau/fooddelivery/model/Payment.java": "3d0700185bf7cf1b357a35c2f36d59422e0e5a38c320d0806681257e5f404df0",
    "src/main/java/vn/gaugaugau/fooddelivery/model/PaymentMethod.java": "e602048c525fb185055d47377819f3938986f4acbc88b36316042e3ca9391b81",
    "src/main/java/vn/gaugaugau/fooddelivery/model/Rating.java": "fbce2f9677b9823eb4e87e499b7abaa961ccb9ca64ea73b932ec14d88f21c5b9",
    "src/main/java/vn/gaugaugau/fooddelivery/model/Restaurant.java": "68ea094414750b8a67518b0efd6f2ba93af7935357ef3e228db8d032f6de999b",
    "src/main/java/vn/gaugaugau/fooddelivery/model/RestaurantFoodItem.java": "6992f56d4b8d8bf71cf731c75af54dc40d1178f4ff0bad578ebab1f9c392a441",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/AdminManagementDtos.java": "dfc7744076191af07528ba5500e6e8c620cfbe6bdae5a057e2c89f9be9c3bc90",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/AvailableDelivery.java": "19b1a7ec9c916cfc9e47bcade88776956146ce8692e68f8a3ea6211a5065985b",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/CartItemRequestDTO.java": "6b22ef562a9b200a435e4eb9808a436ca8857b3d22afbbabe0db469c02c30831",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/CartItemResponseDTO.java": "00f19df81b18b70e146f69b27de201aeb8badda306618beee929dd91326e6590",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/CartItemUpdateRequestDTO.java": "397558e7202e67282f7fdfbb94a3754466a8520b4f753eb825a8b0e1b7d4e968",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/CartResponseDTO.java": "508549868c89b370d92fdaabfc43aa65d0d1201d0f44d01f49a9bd67e00f2319",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/CustomerRequestDTO.java": "b91ea923d51a9f4fea9ac402c0083be1648eeda5e6104de3d6bca60e349efc03",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/CustomerResponseDTO.java": "2b7c96af45ea2f8728c282008a9795a3962830fd2f89313d190da040de6dcb8e",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/CustomerUpdateRequestDTO.java": "3895dfceb045f4cde4ded8409e472c0550046d0e34120107d216dc2229934047",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/DeliveryRequestDTO.java": "0b351b6410eb6b3b2263ea15ccbd1e12db3ce1910442db1e7b9a444f99b57ca4",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/DeliveryResponseDTO.java": "1ade66c5dd22c8f52dd71269302fc17b9504e623f1b02f9435bc9df2d9911d5f",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/DriverManagementDtos.java": "bf3ce73ae94ff9f4eca470282bcb7eeaa67358b377a37b6e925bdb31587a999a",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/DriverRequestDTO.java": "ba6a023e0f0ac49f398ec0ed2d85eb2b1f8d26075c5be51b8c8d152c48fa89cc",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/DriverResponseDTO.java": "26c0d943751a198addad131eb367f81d2da39cc28455e257246a1587e21306ec",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/DriverUpdateRequestDTO.java": "005cd6b8fcad44c1a1a267b9ba04df20c863452275754568a21cdabb03ce2d8d",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/FoodItemRequestDTO.java": "227f1a344abbba667f8a1c74ea507ae14f89f6c86806199e25c991379eea5b8c",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/FoodItemResponseDTO.java": "f7e90332769cfa6aef381be0612fa220e824f55c2289612569a1e3c3281b6045",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/OrderDetailResponseDTO.java": "f37a4066ed1ba61d7bfe0ab3cbe524a658db7057749b3c5c2af4afc54659f388",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/OrderRequestDTO.java": "a9fd7e2358ca997e28cc0ce632aafdb13a2f5d599765ec077c06fb386084cab0",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/OrderResponseDTO.java": "278f688f74869e4b4573b624147452f18429ecc253ccd000fe8262b7cbd93f81",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/OrderUpdateDeliveryAddressRequestDTO.java": "e38e0a13b97f4d538b9d0813ef67ee378cf758fe3e22214336649c8d1bae6d74",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/PageResponse.java": "881652e84121c095320f7a685ecda47bb21ea9a76b46bbc9abe5860658a7bf65",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/PaymentMethodResponseDTO.java": "668472c7c3b1daab622dac72d59340c9c53486f0a974735bdc4c0568a7f36d48",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/PaymentResponseDTO.java": "c808b063c94694650c622eb5adf753d38a48bdc1aeeced7cdd4dbfecf9c1bed7",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/PublicRestaurant.java": "83cfb070c59b256ad332e97325ff7abf16d88a2d4ba91f99980ca9e1a4c68c8d",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/RatingRequestDTO.java": "34362c0c8691771c45542875ab2912d2a5a1eb0ed8613a1f43d7914d532b13e7",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/RatingResponseDTO.java": "bdb3e8e03e21b578ee7b9f49167978b0d1a403cd5501338bcfe386139bf2379e",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/RatingUpdateRequestDTO.java": "95c7dbf10a8946f8f0b29e5f0fb21c1d5e776b2c71e29817302cd3cf07851f1f",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/RestaurantFoodItemRequestDTO.java": "6daf90368a664221e465d88956ff0b62469e14391903531190beef171ca8a998",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/RestaurantFoodItemResponseDTO.java": "180a5aa57c253aef9421e947b56859dbf46f235a7e2fe5b6c357ca296f5265f8",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/RestaurantFoodItemUpdateDTO.java": "1d25ffdea5fc2e3e44924011f26ff7e394eef071691d178a998b91f8f74c8113",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/RestaurantManagementDtos.java": "92d22b1645ebcd7b069b0cb481b916aa07e3071cb5df4d1aa5c92d36ba2d9e86",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/RestaurantRequestDTO.java": "82fa7afeaf082f61464313a7e885f07f6034be0c37172ca74d438f4e9a0e055e",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/RestaurantResponseDTO.java": "33a47922bbd6c14ea44551928fe73af744d582c9b7fef2ab4ae4c48516fe79eb",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/RestaurantUpdateRequestDTO.java": "6014e4c14716cfe5902bd6cb503f42c0960a4dd015cf26dc908b3f66b35572e1",
    "src/main/java/vn/gaugaugau/fooddelivery/model/dto/StrictRequest.java": "18f462192160f84a693febe3c8fc8d0a2d7f198e925b4f261469dcce1c96b32f",
    "src/main/java/vn/gaugaugau/fooddelivery/model/enums/DeliveryStatus.java": "ac4a5302c8359ad22de53c6191813f99a1daa87fb7d29ccb3163ce3739e28d13",
    "src/main/java/vn/gaugaugau/fooddelivery/model/enums/OrderStatus.java": "5bb06c165d973d61259a3a21fe7d73aab82658521b86d9e1926f9139e7d3a5a9",
    "src/main/java/vn/gaugaugau/fooddelivery/model/enums/PaymentStatus.java": "9908a2ac24d9225eba5b6469dada560a55e7ab927a68b67f44a11b579ff0f9e0",
    "src/main/java/vn/gaugaugau/fooddelivery/repository/CartItemRepository.java": "1dd5bdb173db19ecbc32c1dadb5478e9dff222e206dd6619440e17a2b85617a3",
    "src/main/java/vn/gaugaugau/fooddelivery/repository/CartRepository.java": "cae9e7d95652e9941b05e11eea82a1653b689ecba105932039c106f3a2d4a17b",
    "src/main/java/vn/gaugaugau/fooddelivery/repository/CustomerRepository.java": "81741c3875166b4cdbeed0dc3b17ae71a5db112168ca40b3fd6ab2fd6b613ac1",
    "src/main/java/vn/gaugaugau/fooddelivery/repository/DeliveryRepository.java": "5e6a9311e7ac80ce261edac2a00fb016be57b17e8f2a9fdf726c01a908a252a6",
    "src/main/java/vn/gaugaugau/fooddelivery/repository/DriverRepository.java": "8514c3191632caaee25f36087ce0bed2523cd8b03cee89309862c848777f7027",
    "src/main/java/vn/gaugaugau/fooddelivery/repository/FoodItemRepository.java": "54b7840e7e854cb9c884b82bf16663ee03d56959c86dbb590951e9495a2a18e6",
    "src/main/java/vn/gaugaugau/fooddelivery/repository/OrderRepository.java": "39949a2da18aaee5a49a2d09fb7044a1d4cad729a17c30d8789a8594bcdff198",
    "src/main/java/vn/gaugaugau/fooddelivery/repository/PaymentMethodRepository.java": "aabf90a3141d9cdacc7a385247757c6a5c85641fc76404b0f9caa4a6ec20e279",
    "src/main/java/vn/gaugaugau/fooddelivery/repository/PaymentRepository.java": "12979e6dd70c8f0ae1c0c597e6072be76c76b94de7a9853229ee392be825caa6",
    "src/main/java/vn/gaugaugau/fooddelivery/repository/RatingRepository.java": "7f35509da321b9408c5c6fe4b3e0881e8bd7bcfee8aa039b2df5009ad6bc2045",
    "src/main/java/vn/gaugaugau/fooddelivery/repository/RestaurantFoodItemRepository.java": "6cceb1324787ae1c8977a8fdacf0783f9e6d3ab1f7e5b80c0d3bedad8580c3b9",
    "src/main/java/vn/gaugaugau/fooddelivery/repository/RestaurantRepository.java": "990b7fa2e377ba75d0b4ec642c190419a7c83f7adb0690963d06e6757dcca6ad",
    "src/main/java/vn/gaugaugau/fooddelivery/service/AdminManagementService.java": "2fb3c0196919e2d22fa4d2d6ef45c17d5aeba1e063ad1b97831e79bad5671e2e",
    "src/main/java/vn/gaugaugau/fooddelivery/service/CartItemService.java": "998be5ee2a2ea529447e6370bd76971ca492199c2c7bf0c89fdce6ee55e79e08",
    "src/main/java/vn/gaugaugau/fooddelivery/service/CartService.java": "eb33339ef3884060332b776ea321c0a82076e565c94898cf9804121ce755db9d",
    "src/main/java/vn/gaugaugau/fooddelivery/service/CustomerReadService.java": "a2c9c1409475f5e3f1b151a963cabf5417393eb940d6151bbb59924db0101658",
    "src/main/java/vn/gaugaugau/fooddelivery/service/CustomerService.java": "e65aea93967ef45b64a44b3aac3cfdb585ee0c1873f6cfc9a9fb1a66c7cfd2b7",
    "src/main/java/vn/gaugaugau/fooddelivery/service/DeliveryService.java": "944c4550d54ef4de3418406336be84addafc6d3326957176c9b9e4fbe1fa1ff1",
    "src/main/java/vn/gaugaugau/fooddelivery/service/DriverManagementService.java": "300689e69af00ae29d9b22e67ff4a36e10de2cb19d18ce2f363259bc773e21f8",
    "src/main/java/vn/gaugaugau/fooddelivery/service/DriverService.java": "f08eab47db21e9075749a8df7955e67159db1d69b1f9cc1b0c42f191732f1dc4",
    "src/main/java/vn/gaugaugau/fooddelivery/service/FoodItemService.java": "a9b5110ae92dc10bcf178162118b885248d2a5abb1e63621e11cc8696847005f",
    "src/main/java/vn/gaugaugau/fooddelivery/service/OrderService.java": "edb20e315737f0e9fef9cf064ef872913dcf21e7fa978d93e7d69156649fbe62",
    "src/main/java/vn/gaugaugau/fooddelivery/service/PaymentService.java": "79e2b655622b9580d7308874d8fdf0ec79987a2fcb6f934285060f512efa054f",
    "src/main/java/vn/gaugaugau/fooddelivery/service/RatingService.java": "bb975fabbfdcd2576daa095c28934071de4725e9ece002f04459135418276b44",
    "src/main/java/vn/gaugaugau/fooddelivery/service/ReadQuery.java": "b08796c95fab2b62cd4dabe31df8c849bc8d6b2e9ef372cc5f3ea593d543a202",
    "src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantFoodItemService.java": "55961e6ee2a82c229a5a4dcf4894e296d28909135fdd0ca7dc96c2f620931065",
    "src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantManagementService.java": "7fa8c3604c5217f739252fcb642928537c39863943295661fa89274f9e2c5bd3",
    "src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantService.java": "d5b25f61435d04a68f235846a0b25e559931414e2935a33d5b8e2da06758ca7d",
    "src/main/java/vn/gaugaugau/fooddelivery/utils/ApiResponse.java": "cacfd6c6a2ef53df1d574a124ddd85081550b55a6e0eff5b983c5cb45257e932",
    "src/main/java/vn/gaugaugau/fooddelivery/utils/GlobalExceptionHandler.java": "a87980c79383abf887ae78d5006d6944e4ba3c3736e5adc373e008e0aa22f00f",
    "src/main/java/vn/gaugaugau/fooddelivery/utils/VersionPreconditions.java": "b8641ba01d6bed819d69dc89a4389e26fdb4d888bc5f6d2ff41be2a1337d6968",
    "src/main/java/vn/gaugaugau/fooddelivery/utils/exception/BadRequestException.java": "b4401d1167c14284fc0f4774d0b97600bf8aa98e6464200c4b746d7f98678e24",
    "src/main/java/vn/gaugaugau/fooddelivery/utils/exception/ResourceAlreadyExistsException.java": "c8d4f5eff2e0678c8ce61a42862931d204a908ca10e17ebb1a6fc1a707fa164b",
    "src/main/java/vn/gaugaugau/fooddelivery/utils/exception/ResourceNotFoundException.java": "e844d533c083043db3ef3549680062fe02d4013bfdeb396dfffc347ceac6f803",
    "src/main/resources/application.properties": "d36611ba134b4931fa69ab49fa10d44af6dfb63284402cc2d2ea89de94643348",
    "src/main/resources/db/manual/00_preflight_readonly.sql": "1a06a9029b6053f530dbd658ad545f137a06ee3c15957f19ad359dcbe9bba580",
    "src/main/resources/db/manual/01_expand_auth.sql": "0ac7ddd802fff02eff543c2a3edfc78785e98732c224459c6235f8a6e74a79a4",
    "src/main/resources/db/manual/02_backfill_accounts.sql": "1996cedacc10b25858e6964e037b3f210091d992a4c8fc25da2e2303707914b9",
    "src/main/resources/db/manual/03_stage8_versions.sql": "b6dc2c321a37d37a5a35ef8917cbb7f38fe1653e5662ad556ec5fdd89de0b7b8",
    "src/main/resources/db/manual/README.md": "801056bc15531f7f66d27a6246f399b47c2de1b82b1b12c941670d11f6a233d4",
    "src/main/resources/static/favicon.ico": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "src/test/java/vn/gaugaugau/fooddelivery/FooddeliveryApplicationTests.java": "4fb52df60781c271a6e8993245b974cd117e3a337cb1649270b6e9709eb04d8c",
    "src/test/java/vn/gaugaugau/fooddelivery/FullAuditDriverDateTest.java": "593f8207c9e9014ecde32cde9c6716b45208933dd8fde053985370d59fe84b1c",
    "src/test/java/vn/gaugaugau/fooddelivery/FullAuditTargetGuardTest.java": "f72e58dd3fd5914d6335204a2040d99bf00e6bb6e804a36024faee1517253887",
    "src/test/java/vn/gaugaugau/fooddelivery/MySqlStage1IntegrationTest.java": "955c5160936ff4a679802f1f092b1928dc9f2176088d24c89f406d899a64c3c6",
    "src/test/java/vn/gaugaugau/fooddelivery/Phase8FoundationTest.java": "d1c5e58a7dc2780b7b9fdd5ae5566000725c8b0693b4ecf2a3a9f445bc4f6dc7",
    "src/test/java/vn/gaugaugau/fooddelivery/Phase8MvcContractTest.java": "c3fe9c460adaee6d27c32c188cb908fbc5900b35d60261647a7fdc9ea99959a4",
    "src/test/java/vn/gaugaugau/fooddelivery/Phase8RestaurantDateTest.java": "ba88b87d6308b8b83b1e117c54c3edad934dfd382b74f366793df5c2c73ea548",
    "src/test/java/vn/gaugaugau/fooddelivery/auth/AdminManagementMySqlTest.java": "c4c6632d2a1574073bafe149292c71b9f75009509fcbd1ddb7430dc9c4ee3d2f",
    "src/test/java/vn/gaugaugau/fooddelivery/auth/ApprovedMySqlTestTarget.java": "1bbd85b95ad7f1e42485c0f05f9f0ab8389eaf1d11873aab78d4c2e7645c84e5",
    "src/test/java/vn/gaugaugau/fooddelivery/auth/AuthMigrationMySqlTest.java": "fdfde60111461eb9f65619c4aa0986e52170e0d5a0c4e3cbcdb5dd8ea9ad144e",
    "src/test/java/vn/gaugaugau/fooddelivery/auth/AuthModelTest.java": "c448aaa20c24d77797abd3f6fe373ac38c5c18e15495bfc4863c4ee62de6c71b",
    "src/test/java/vn/gaugaugau/fooddelivery/auth/AuthPersistenceMySqlTest.java": "585a1a78876cc84ca2fd983dcc064e055b2b5db6361366be9da9cf17e51c934f",
    "src/test/java/vn/gaugaugau/fooddelivery/auth/AuthPreflightMySqlTest.java": "fd74fa8306a795d2d10b71be55ff09df696b1fa64abe91dac86c763f78030d7c",
    "src/test/java/vn/gaugaugau/fooddelivery/auth/AuthTestKeys.java": "a4c208dadba08ac77ac8ebef2eb15459d46768ccf9f8260fd42384d0560f8dd3",
    "src/test/java/vn/gaugaugau/fooddelivery/auth/CustomerReadMySqlIntegrationTest.java": "6ea996a4db66f36b67c38dbf27a092aba7b32d929b863f88d9013e1c5a994e5a",
    "src/test/java/vn/gaugaugau/fooddelivery/auth/DriverManagementMySqlTest.java": "242ce36598abad8d6457e17ef0b66129a4dc9fe2a595b057a6323c37c42d405e",
    "src/test/java/vn/gaugaugau/fooddelivery/auth/LoginLimiterTest.java": "9e0caa74035839f6e07aaf8ece20f8d92d23955d8c567b5b4a528758fb2ce4e2",
    "src/test/java/vn/gaugaugau/fooddelivery/auth/Phase8ConcurrencyMySqlTest.java": "85f7337202d641473baee1ae2f1b06fa344e358d8528f3fc23b0cab1fc6ac1a2",
    "src/test/java/vn/gaugaugau/fooddelivery/auth/RestaurantManagementMySqlTest.java": "c442fcb30bf13dc1ffbc3f18a6721023b9d31613d83d418ba7bfea0801c6517f",
    "src/test/java/vn/gaugaugau/fooddelivery/auth/SecurityMySqlIntegrationTest.java": "588ab508e07f309d42911a9a5f189ac7891a50ad88221694c998dc7ece3a73d9",
    "src/test/java/vn/gaugaugau/fooddelivery/service/BackendServiceTest.java": "40db68c2b6cfa7619e818804e5994148c6178c83fd978935b09299bce2669760",
    "src/test/java/vn/gaugaugau/fooddelivery/service/ReadQueryTest.java": "5f6c3cab50ca4def9349b5061bd824e4c5ba432d48ff5d6337ca66047108fc21",
    "src/test/java/vn/gaugaugau/fooddelivery/service/TransactionIntegrationTest.java": "1458203a88cb83bd64b87f6f189c4b79db36db3bfdb56297d38af9b13291cd5f",
    "src/test/java/vn/gaugaugau/fooddelivery/web/ApiBindingUnitTest.java": "cd4b141fafdbbc5853767742e94c15a4d70af3d72d9b70b2dd8069117374ffa0"
  }
}
```

## Phương pháp và phạm vi tìm kiếm

Đọc source/tài liệu/cấu hình/lịch sử local, liệt kê cây và tìm bằng rg. Kiểm kê133file mainJava và120file frontend/src (gồm asset/test), các Controller/Service/Repository,16 Entity, routes và feature form/search/report. Không khẳng định từng binary/UIasset đã được phân tích nội dung. Quét thêm tên/đuôi ERD/diagram/.drawio/.mwb/.puml/.vsdx/.pdf/.docx trong repository ngoài .git/node_modules/target/dist/test-results/playwright-report. Không tìm thấy artifact ERD/DataDiagram khả dụng. Không quét ổđĩa cá nhân để đoán tài liệu người dùng chưa cung cấp.

Không truy cập web/GitHub/MySQL3306; không đọc envprivate/token/password. SQL từ dump chỉ trích CREATE TABLE, constraint và index, không INSERT. Không khởi động DB test3307 khi thấy không listener. Không build/test/browser/install vì có thể tạo cache/artifact hoặc ghiDB. Không tạo script/JSON/ảnh/PDF/DOCX ngoài mười Markdown được cho phép.

Lệnh Git qua -C trong Python ban đầu bị dubious ownership; không sửa safe.directory/globalconfig, không escalation; dùng --git-dir/--work-tree rõ ràng để đọc local. Một bước ghi tài liệu nội bộ ban đầu gặp encoding/syntax, đã sửa ngay trong các file A1 mới; kiểm UTF-8 trước bàn giao, không ảnh hưởng source/evidencecũ.

## Mức độ tin cậy

- SOURCE: đọc implementation hiện tại và anchor theo dòng; VERIFIED tĩnh không đồng nghĩa chạyAPI mới.
- DUMP: DDL snapshot thử nghiệm8.2, có hash nguồn và metadata đối chiếu, không là production/live.
- HISTORICAL RUN: JSON/test/assertion đã có, ghi rõ root/thời điểm; không tính là test A1.
- DOCUMENT ONLY: lời mô tả cũ chưa được source/log xác nhận độc lập được ghi giới hạn.
- DB LIVE NOT VERIFIED: không kết nối trongA1; thiếu runtime không được bù bằng tự khởi động.

## Tài liệu8.2 bắt buộc đã kiểm tra

| File | Tồn tại | SHA-256 |
|---|---|---|
| [phase8-2-result.md](../phase8-2-result.md) | FOUND | `b3533449851e53316d05896d77aad7dfd970b56f165b5c7c8189a858473756e8` |
| [phase8-2-test-results.md](../phase8-2-test-results.md) | FOUND | `1c6aefa58e49fd1a3e717bb61c8881b874908e79ac690498f8ce86ac8758b706` |
| [phase8-2-files.txt](../phase8-2-files.txt) | FOUND | `0b5669ca8b8d5f32ed476c3b984e20e5ec0ed6abeef89c0ff3bb56e14440af50` |
| [phase8-2-browser-matrix.md](../phase8-2-browser-matrix.md) | FOUND | `3e000b865503f9016d5a16ac51901994cf4e846372015c5a08c89e226735cdea` |
| [phase8-2-security-audit.md](../phase8-2-security-audit.md) | FOUND | `484920be135d9e0ac55e5351a7ceffcd2f26d086812ad5cd035d9843b16cfc8d` |
| [phase8-2-production-readiness.md](../phase8-2-production-readiness.md) | FOUND | `dd266ee7a08e423623d272f9ebe4d7ae925dca8686415c6b868dd88e837eed1a` |
| [phase8-2-blocker-analysis.md](../phase8-2-blocker-analysis.md) | FOUND | `aa346011fd4113cb32c58677a22d42d9d5357098ecfd0c5b7c956335fa360eca` |

## Bằng chứng ngoài repo — chỉ đọc, giữ nguyên

Không chép credential/rawbusinessrows vào tài liệu; hash dưới xác định snapshot đã tham khảo.

| Nguồn | Vai trò | SHA-256 |
|---|---|---|
| [phase8-2-load-boundary-20261111/stage8-final-backup.sql](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/stage8-final-backup.sql>) | DDL16 bảng, không sao chépdata | `5bb2f7c72bf05b370b255cdb575ba21c20fed95e82b9059001e2753d723695dc` |
| [phase8-2-load-boundary-20261111/logs/database-integrity-final.json](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/logs/database-integrity-final.json>) | Metadata/checks54 snapshot | `19828c47a4bfff37765e8402713521064251e4cf53fbda6607401c6cb55c2d29` |
| [phase8-2-load-boundary-20261111/logs/backup-restore-proof.json](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/logs/backup-restore-proof.json>) | Restore16 bảng, validateSELECT-only lịch sử | `309117d204f56b0ff928d739c85848e065435f673d66a5a769e4732d999b88c9` |
| [phase8-2-load-boundary-20261111/logs/mysql-admin-reporting-proof.json](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/logs/mysql-admin-reporting-proof.json>) | Oracle2417order;697 completed paid,32.972.000VND | `1e6b5612fb8c5e0f9e8aaa3e646f0078ca017c41eadcca172dd0cc54af2b69f4` |
| [phase8-2-20261111/logs/mysql-admin-reporting-proof.json](<F:/New folder/food-delivery-mysql-test/phase8-2-20261111/logs/mysql-admin-reporting-proof.json>) | Oracletrước load2187order, không trộn thời điểm | `32b4755675aa1f8609d2009a665c15218a089eb9b0119083900f91e851b31153` |
| [phase8-2-20261111/logs/backend-junit-summary.json](<F:/New folder/food-delivery-mysql-test/phase8-2-20261111/logs/backend-junit-summary.json>) | 178 JUnit cũ;22 suite, không run A1 | `d5af64a3d0b23e72f48da370e4eee55b5594826df83e7a7940ece4c572701654` |
| [phase8-2-20261111/logs/frontend-unit.json](<F:/New folder/food-delivery-mysql-test/phase8-2-20261111/logs/frontend-unit.json>) | 315 frontend cũ | `efc46562657293d849640dde27229cf248b55eeeb8b16cced5ee78d5d1e9a134` |
| [phase8-2-20261111/logs/cross-browser-audit-summary.json](<F:/New folder/food-delivery-mysql-test/phase8-2-20261111/logs/cross-browser-audit-summary.json>) | Windows main 204/6 | `fc3af0e7a50f30cb37186cc14ac5b093a67732042300b465f5a04211acd2f08e` |
| [phase8-2-20261111/logs/phase8-extra-summary.json](<F:/New folder/food-delivery-mysql-test/phase8-2-20261111/logs/phase8-extra-summary.json>) | Windowsstrict 14/1 | `8d450121ebae7df32cec72dd9a73bc94e1817a8fe14d601370a777b11fdb2660` |
| [phase8-2-20261111/logs/linux-matrix-summary.json](<F:/New folder/food-delivery-mysql-test/phase8-2-20261111/logs/linux-matrix-summary.json>) | Linux main 210/0,strict 15/0 | `bb6fe9d6b805ca12696f4d53040ceeee39f6a3e532478629a24bf178ddf668fb` |
| [phase8-2-load-boundary-20261111/logs/performance-results.json](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/logs/performance-results.json>) | Load24/24 cũ | `8a4e0963d1d165d188279c30ad1fe88ac8e97775ddc94454b68acd3cbb9e0587` |
| [phase8-2-load-boundary-20261111/logs/final-shutdown-proof.json](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/logs/final-shutdown-proof.json>) | DừngtestvàMySQL80Running ở cuối8.2 | `ca3791988634a96a3a90eb679945f5a9b2ae97a4e396291e85071fe34a9c3055` |
| [phase8-2-load-boundary-20261111/logs/final-handover-verification.json](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/logs/final-handover-verification.json>) | Gatecuối8.2 vàGitprovenance, không verdictcoursework | `fd59ccace9d8d5bbf11f8fb0748c11b215883ac7e786582bb1b126be6d072d3f` |

## Chỉ mục source theo yêu cầu

| Hạng mục | Nguồn và vị trí | Ý nghĩa |
|---|---|---|
| Schema | [src/main/java/vn/gaugaugau/fooddelivery/model/Customer.java:24](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/Customer.java:24>) | `@Table` |
| Schema | [src/main/java/vn/gaugaugau/fooddelivery/model/Restaurant.java:21](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/Restaurant.java:21>) | `@Table` |
| Schema | [src/main/java/vn/gaugaugau/fooddelivery/model/Driver.java:21](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/Driver.java:21>) | `@Table` |
| Schema | [src/main/java/vn/gaugaugau/fooddelivery/model/FoodItem.java:19](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/FoodItem.java:19>) | `@Table` |
| Schema | [src/main/java/vn/gaugaugau/fooddelivery/model/RestaurantFoodItem.java:24](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/RestaurantFoodItem.java:24>) | `@Table` |
| Schema | [src/main/java/vn/gaugaugau/fooddelivery/model/Cart.java:24](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/Cart.java:24>) | `@Table` |
| Schema | [src/main/java/vn/gaugaugau/fooddelivery/model/CartItem.java:21](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/CartItem.java:21>) | `@Table` |
| Schema | [src/main/java/vn/gaugaugau/fooddelivery/model/Order.java:30](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/Order.java:30>) | `@Table` |
| Schema | [src/main/java/vn/gaugaugau/fooddelivery/model/OrderDetail.java:21](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/OrderDetail.java:21>) | `@Table` |
| Schema | [src/main/java/vn/gaugaugau/fooddelivery/model/Payment.java:28](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/Payment.java:28>) | `@Table` |
| Schema | [src/main/java/vn/gaugaugau/fooddelivery/model/PaymentMethod.java:19](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/PaymentMethod.java:19>) | `@Table` |
| Schema | [src/main/java/vn/gaugaugau/fooddelivery/model/Delivery.java:25](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/Delivery.java:25>) | `@Table` |
| Schema | [src/main/java/vn/gaugaugau/fooddelivery/model/Rating.java:22](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/Rating.java:22>) | `@Table` |
| Authschema | [src/main/java/vn/gaugaugau/fooddelivery/auth/model/Account.java:15](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/auth/model/Account.java:15>) | `@Table` |
| Authschema | [src/main/java/vn/gaugaugau/fooddelivery/auth/model/AuthSession.java:8](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/auth/model/AuthSession.java:8>) | `@Entity` |
| Authschema | [src/main/java/vn/gaugaugau/fooddelivery/auth/model/RefreshToken.java:7](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/auth/model/RefreshToken.java:7>) | `@Entity` |
| F1 | [frontend/src/features/admin-management/CreatePages.tsx:17](<F:/New folder/food-delivery/frontend/src/features/admin-management/CreatePages.tsx:17>) | `export function AdminCreateProfile` |
| F1writer | [src/main/java/vn/gaugaugau/fooddelivery/auth/service/AuthService.java:59](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/auth/service/AuthService.java:59>) | `public Me createRestaurant` |
| F2 | [frontend/src/features/restaurant-management/MenuPages.tsx:23](<F:/New folder/food-delivery/frontend/src/features/restaurant-management/MenuPages.tsx:23>) | `export function MenuForm` |
| F2writer | [src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantFoodItemService.java:57](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantFoodItemService.java:57>) | `createRestaurantFoodItem(RestaurantFoodItemRequestDTO` |
| S1 | [src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantManagementService.java:56](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantManagementService.java:56>) | `public PageResponse<OrderResponseDTO> orders` |
| R1 | [src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantManagementService.java:74](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantManagementService.java:74>) | `public Analytics analytics` |
| R2 | [src/main/java/vn/gaugaugau/fooddelivery/service/AdminManagementService.java:90](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/AdminManagementService.java:90>) | `public Analytics analytics` |
| 3NF | [src/main/java/vn/gaugaugau/fooddelivery/service/OrderService.java:149](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/OrderService.java:149>) | `BigDecimal subtotalItem` |
| 3NF | [src/main/java/vn/gaugaugau/fooddelivery/auth/service/AuthService.java:104](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/auth/service/AuthService.java:104>) | `refresh.saveAndFlush` |
| SchemaSQL | [database/migrations/01_expand_auth.sql:38](<F:/New folder/food-delivery/database/migrations/01_expand_auth.sql:38>) | `CREATE TABLE accounts` |
| MigrationSQL | [database/migrations/02_backfill_accounts.sql:41](<F:/New folder/food-delivery/database/migrations/02_backfill_accounts.sql:41>) | `START TRANSACTION` |
| VersionSQL | [database/migrations/03_stage8_versions.sql:16](<F:/New folder/food-delivery/database/migrations/03_stage8_versions.sql:16>) | `ALTER TABLE accounts` |
| Searchtests | [src/test/java/vn/gaugaugau/fooddelivery/auth/RestaurantManagementMySqlTest.java:155](<F:/New folder/food-delivery/src/test/java/vn/gaugaugau/fooddelivery/auth/RestaurantManagementMySqlTest.java:155>) | `orderListIsOwnerScopedFilteredAndSearchable` |
| Reporttests | [src/test/java/vn/gaugaugau/fooddelivery/auth/AdminManagementMySqlTest.java:124](<F:/New folder/food-delivery/src/test/java/vn/gaugaugau/fooddelivery/auth/AdminManagementMySqlTest.java:124>) | `successfulMoneyRejects` |
| F1E2E | [frontend/e2e/admin.spec.ts:186](<F:/New folder/food-delivery/frontend/e2e/admin.spec.ts:186>) | `admin creates Restaurant` |
| F2E2E | [frontend/e2e/restaurant.spec.ts:169](<F:/New folder/food-delivery/frontend/e2e/restaurant.spec.ts:169>) | `restaurant catalog add` |
| KPIrule | [docs/phase7-reporting-definitions.md:11](<F:/New folder/food-delivery/docs/phase7-reporting-definitions.md:11>) | `## KPI` |
| Snapshotrule | [docs/phase5-business-rules.md:9](<F:/New folder/food-delivery/docs/phase5-business-rules.md:9>) | `Giá OrderDetail` |
| Config | [src/main/resources/application.properties:10](<F:/New folder/food-delivery/src/main/resources/application.properties:10>) | `ddl-auto=validate` |

## Đối chiếu cuối A1

```json
{
  "checkedAtAsiaSaigon": "2026-11-12T00:11:16.854673+07:00",
  "branch": "main",
  "head": "0315de8566d299472b28b2f10bb50326c7d6b9aa",
  "branchHeadRemotesUnchanged": true,
  "baselineFilesHashed": 409,
  "existingFilesChangedOrMissing": [],
  "newPaths": [
    "docs/coursework-audit/A1-database-inventory.md",
    "docs/coursework-audit/A1-demo-readiness.md",
    "docs/coursework-audit/A1-erd-relational-review.md",
    "docs/coursework-audit/A1-evidence-index.md",
    "docs/coursework-audit/A1-forms-search-reports.md",
    "docs/coursework-audit/A1-grading-scorecard.md",
    "docs/coursework-audit/A1-normalization-3nf.md",
    "docs/coursework-audit/A1-overview.md",
    "docs/coursework-audit/A1-phase-A2-backlog.md",
    "docs/coursework-audit/A1-sql-traceability.md"
  ],
  "newFilesOnlyWithinApprovedDirectory": true,
  "testsOrBuildsExecutedInA1": 0,
  "databaseConnectionsInA1": 0,
  "databaseWritesInA1": 0,
  "processesStartedInA1": 0,
  "commitPushPullResetRebaseMergeDeployByAgent": false,
  "gitStatusAfter": "?? docs/coursework-audit/\n?? docs/phase8-2-blocker-analysis.md\n?? docs/phase8-2-browser-matrix.md\n?? docs/phase8-2-files.txt\n?? docs/phase8-2-production-readiness.md\n?? docs/phase8-2-result.md\n?? docs/phase8-2-security-audit.md\n?? docs/phase8-2-test-results.md\n?? \"how -s --format=fuller 0315de8\"",
  "scopeLimit": "Ignored build/dependency caches not exhaustively hashed; no tool invoked to mutate them. Historical evidence read only."
}
```

Các thay đổi ban đầu đều còn nguyên hash. Có đúng10 file A1 mới, không thêmfilengoài thư mục được duyệt. Không tuyên bố đã CHECKSUM database live: A1 không kết nốiMySQL; an toàn DB dựa trên không có thao tác kết nối/ghi, không phải một truy vấn hậu kiểm mới. MySQL80 không được điều khiển trongA1.

## Kiểm tra tài liệu và trạng thái cuối

Đủ 10 file, UTF-8 hợp lệ; không ký tự thay thế hoặc dấu hiệu hỏng tiếng Việt; code fence cân bằng; tất cả liên kết file đã kiểm tra tồn tại. Không chạy formatter/build có thể ghi artifact. 409 hash file ban đầu, branch main, HEAD0315de8 và remote vẫn không đổi sau lần kiểm tra cuối. Get-Service chỉ đọc xác nhận MySQL80 Running; 3307 không có listener. Không kiểm tra CHECKSUM DB live.

Lịch sử local chỉ đọc: 0315de8 (Update Food Delivery Phase8.2, 11/11/2026 23:23:34 UTC+7), 12444c6 (Stage7), 149b30b (Stage6). Không xác minh remote hoặc tác nhân tạo commit trong A1.

Hash9tài liệu bàn giao (không hash chính index để tránh tự tham chiếu):

| File | SHA-256 |
|---|---|
| [A1-database-inventory.md](A1-database-inventory.md) | `b774bc304f92bbb90cdbb476d056f27f3112bcdc7d8b9f3bb2263accf1060a3d` |
| [A1-demo-readiness.md](A1-demo-readiness.md) | `41159f8733bc97ced668fdd82b4d7bf2e60f64fa83446ae3edcba80ceada79b4` |
| [A1-erd-relational-review.md](A1-erd-relational-review.md) | `8f9bbc444c05ce2a64d4af5ba61938ac465a6b1449232790cdd47d5da3bfa227` |
| [A1-forms-search-reports.md](A1-forms-search-reports.md) | `c9927a4ec6bcdb67b985b1728d43bf53c91ba29d41fb1b0d1ce7eae3fabf38a5` |
| [A1-grading-scorecard.md](A1-grading-scorecard.md) | `143bf14e6d1e3a4893ddecf9e9f960ed4604b088b1efcd02f83b129cedeb6dde` |
| [A1-normalization-3nf.md](A1-normalization-3nf.md) | `6466049f0a85ebe4cfa5b54cfc56a0af9a8c8059715f498aba9ab9363677b5f9` |
| [A1-overview.md](A1-overview.md) | `426cf2627f0c92659c3fa53195a426b009210bff1d4613a8334fc05ca14e6ced` |
| [A1-phase-A2-backlog.md](A1-phase-A2-backlog.md) | `dc4dbd1bb584125a92408cf045e4d1fdab4b62e7974de1f8ffaa9c276e3d5dbc` |
| [A1-sql-traceability.md](A1-sql-traceability.md) | `4fa24d8f7a4a37e2c03e0095d15c0eb027f6f97881fb3f6347f58a5f0707a9cc` |
