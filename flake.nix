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
          propagatedBuildInputs = [
            pkgs.coreutils
            pkgs.file
            pkgs.gawk
            pkgs.jq
            pkgs.moreutils
            pkgs.parallel
            pkgs.ripgrep
          ];
          buildPhase = ''
            true
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
