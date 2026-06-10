import { Module } from "@nestjs/common";
import { FileService } from "./file.service.js";
import { FileController } from "./file.controller.js";

@Module({ controllers: [FileController], providers: [FileService], exports: [FileService] })
export class FileModule {}
