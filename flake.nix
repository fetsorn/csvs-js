{
  description = "csvs - comma-separated value store";

  inputs = { nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable"; };

  outputs = inputs@{ self, nixpkgs, ... }:
    let
      eachSystem = systems: f:
        let
          op = attrs: system:
            let
              ret = f system;
              op = attrs: key:
                let
                  appendSystem = key: system: ret: { ${system} = ret.${key}; };
                in attrs // {
                  ${key} = (attrs.${key} or { })
                    // (appendSystem key system ret);
                };
            in builtins.foldl' op attrs (builtins.attrNames ret);
        in builtins.foldl' op { } systems;
      defaultSystems = [
        "aarch64-linux"
        "aarch64-darwin"
        "i686-linux"
        "x86_64-darwin"
        "x86_64-linux"
      ];
    in eachSystem defaultSystems (system:
      let
        pkgs = import nixpkgs { inherit system; };
        csvs-sh = pkgs.stdenv.mkDerivation {
          name = "csvs-sh";
          src = ./sh/scripts;
          buildPhase = ''
            true
          '';
          postPatch = ''
            substituteInPlace merge --replace "jq" "${pkgs.jq}/bin/jq"
            substituteInPlace unescape --replace "jq" "${pkgs.jq}/bin/jq"
            substituteInPlace break-biorg.awk --replace "jq" "${pkgs.jq}/bin/jq"
            substituteInPlace build-biorg --replace "jq" "${pkgs.jq}/bin/jq"
            substituteInPlace build-biorg --replace "bash" "${pkgs.bash}/bin/bash"
            substituteInPlace mdirsync --replace "bash" "${pkgs.bash}/bin/bash"
            substituteInPlace mdirsync --replace "awk" "${pkgs.gawk}/bin/awk"
            substituteInPlace gc --replace "jq" "${pkgs.jq}/bin/jq"
            substituteInPlace gc --replace "sponge" "${pkgs.moreutils}/bin/sponge"
            substituteInPlace lookup --replace "grep" "${pkgs.gnugrep}/bin/grep"
            substituteInPlace build-biorg --replace "grep" "${pkgs.gnugrep}/bin/grep"
            substituteInPlace merge --replace "grep" "${pkgs.gnugrep}/bin/grep"
            substituteInPlace break-biorg.awk --replace "grep" "${pkgs.gnugrep}/bin/grep"
          '';
          installPhase = ''
            mkdir -p $out/bin/
            cp * $out/bin/
            chmod +x $out/bin/*
          '';
        };
        csvs-js = pkgs.mkYarnPackage rec {
          name = "csvs-js";
          src = ./js;
          configurePhase = ''
            true
          '';
          buildPhase = ''
            true
          '';
          dontInstall = true;
          doDist = false;
        };
      in rec {
        devShell = pkgs.mkShell {
          buildInputs = with pkgs; [
            bash_unit
            coreutils
            file
            gawk
            jq
            moreutils
            parallel
            ripgrep
            nodejs-16_x
            nodePackages.np
            yarn
          ];
        };
        packages = { inherit csvs-sh csvs-js; };
        defaultPackage = csvs-sh;
      });
}
